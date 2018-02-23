// This module provides middleware that adds the price of things to res.locals

export default (req, res, next) => {
    // If our exchange rate middleware fails, we should have a default one
    const {
        exchangeRates: {
            defaults: {
                USD: defaultExchangeRateUSD
            } = {}
        } = {}
    } = res.locals.config;

    if (!defaultExchangeRateUSD) {
        throw new Error('Missing default USD exchange rate from config');
    }

    const {
        exchangeRates: {
            USD: exchangeRateUSD = 0.78748
        } = {}
    } = res.locals;

    if (!exchangeRateUSD) {
        throw new Error('Missing exchange rate information');
    }

    res.locals.prices = {};
    const membershipPrice = 3;

    res.locals.prices.membershipCAD = membershipPrice.toFixed(2);
    res.locals.prices.membershipUSD = (membershipPrice * exchangeRateUSD).toFixed(2);

    return next();
}
