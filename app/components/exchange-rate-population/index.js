// This module provides middleware that loads currency conversion information into
// res.locals. It fetches this information for the db. The db should be refreshed everyday
// with this information so if the data is old, this middleware will make a request
// for fresh information, save it to the db, and then populate it in res.locals

import { wrap as coroutine } from 'co';
import request from 'request-promise';
import moment from 'moment';

import { required, print } from '../custom-utils';
import { getCurrentExchangeRates } from '../data';
import { insert as insertInDb } from '../db/service';

export default ({
    exchangeRatesCollection = required('exchangeRatesCollection'),
    logger = required('logger', 'You must pass in a logging instance for this api to use')
}) => coroutine(function* (req, res, next) {
    const {
        exchangeRates: {
            reqUrl: exchangeRatesUrl
        } = {}
    } = res.locals.config;

    if (!exchangeRatesUrl) {
        throw new Error('Missing exchange rates url from config');
    }

    let rates;

    // First, see if there are fresh rates in the db
    try {
        rates = yield getCurrentExchangeRates({ exchangeRatesCollection });
    } catch (e) {
        logger.error(e.err, e.msg);
        res.locals.exchangeRates = null;

        return next();
    }

    if (!rates) {
        // We need to fetch current rates and save them to the db
        let ratesResponse;

        try {
            ratesResponse = yield request({
                uri: exchangeRatesUrl,
                json: true
            });
        } catch (e) {
            logger.error(e, 'Error getting exchange rate info');
            res.locals.exchangeRates = null;

            return next();
        }

        if (!ratesResponse.rates) {
            // Something is wrong with the response
            logger.error('Malformed exchange rates response');
            res.locals.exchangeRates = null;

            return next();
        }

        try {
            yield insertInDb({
                collection: exchangeRatesCollection,
                document: {
                    validOn: moment().startOf('day').toDate(),
                    ...ratesResponse
                }
            });
        } catch (e) {
            logger.error(e, 'Error saving exchange rate info to db');
            res.locals.exchangeRates = null;

            return next();
        }

        rates = ratesResponse.rates;
    }

    res.locals.exchangeRates = rates;

    return next();
});
