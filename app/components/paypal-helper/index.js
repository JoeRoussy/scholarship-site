
import querystring from 'querystring';
import rp from 'request-promise';

import { required, print } from '../custom-utils';
import config from '../../config';
import { findCurrentPaypalAccessToken, savePaypalAccessToken } from '../data';

// TODO: Would be nice to have better error handling in this module

const {
    host: gatewayEndpoint,
    clientId,
    secret,
    endpoints: {
        checkout: checkoutEndpoint,
        getAccept: getAcceptEndpoint,
        checkoutExperiences: checkoutExperiencesEndpoint
    } = {},
    createCheckoutExperienceWithNoShippingPayload
} = config.paypal;

const token = {
    clientId,
    secret
};

const defaultRequestParams = {
    intent: "sale",
    payer: {
        payment_method: "paypal"
    }
};

export const checkout = ({
    transactions = required('transactions'),
    returnUrl = required('returnUrl'),
    cancelUrl,
    experienceProfileId = required('experienceProfileId'),
    paypalTokensCollection = required('paypalTokensCollection')
}) => {
    const body = {
        transactions,
        redirect_urls: {
            return_url: returnUrl,
            cancel_url: cancelUrl || returnUrl
        },
        experience_profile_id: experienceProfileId
    };

    return makeGatewayRequest({
        request: checkoutEndpoint,
        token,
        body: {
            ...body,
            ...defaultRequestParams
        },
        paypalTokensCollection
    });
};

export const accept = ({
    paymentId = required('paymentId'),
    payerId = required('payerId'),
    paypalTokensCollection = required('paypalTokensCollection')
}) => {
    return makeGatewayRequest({
        request: getAcceptEndpoint(paymentId),
        token,
        body: {
            payer_id: payerId
        },
        paypalTokensCollection
    });
};

export const createCheckoutExperienceWithNoShipping = ({
    paypalTokensCollection = required('paypalTokensCollection')
}) => makeGatewayRequest({
    request: checkoutExperiencesEndpoint,
    token,
    body: createCheckoutExperienceWithNoShippingPayload,
    paypalTokensCollection
});

export const getCheckoutExperiences = ({
    paypalTokensCollection = required('paypalTokensCollection')
}) => makeGatewayRequest({
    method: 'GET',
    request: checkoutExperiencesEndpoint,
    token,
    paypalTokensCollection
});

const authenticateGatewayRequest = async({
    clientId,
    secret,
    paypalTokensCollection
}) => {
    // First see if we have a valid access token;
    let currentToken = null;

    try {
        currentToken = await findCurrentPaypalAccessToken({ paypalTokensCollection });
    } catch (e) {
        throw new Error(e);
    }

    if (currentToken) {
        return currentToken.token;
    }

    // We don't have an access token so we need to get one
    const token = new Buffer(`${clientId}:${secret}`).toString('base64');
    const body = {
        grant_type: 'client_credentials'
    };


    // We don't have a token so we need to get one, save it, and return it
    let newTokenResponse = null;

    try {
        newTokenResponse = await rp({
            uri: `${gatewayEndpoint}/v1/oauth2/token`,
            method: 'POST',
            headers: {
                "Authorization": `Basic ${token}`,
                "Accept": "application/json",
                "Content-Type": 'application/x-www-form-urlencoded'
            },
            body: querystring.stringify(body)
        });
        newTokenResponse = JSON.parse(newTokenResponse);
    } catch (e) {
        throw new Error(e);
    }

    try {
        await savePaypalAccessToken({
            paypalTokensCollection,
            token: newTokenResponse.access_token,
            expires: newTokenResponse.expires_in
        });
    } catch (e) {
        throw new Error(e);
    }

    return newTokenResponse.access_token;
}

const makeGatewayRequest = ({
    request,
    token,
    body,
    method = 'POST',
    paypalTokensCollection = required('paypalTokensCollection')
}) => authenticateGatewayRequest({ ...token, paypalTokensCollection })
    .then(accessToken => rp({
        uri: gatewayEndpoint+request,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        method,
        body: JSON.stringify(body)
    }))
    .then(response => JSON.parse(response))
    .catch(err => {
        // TODO: Normalize this error
        throw new Error(err);
    });
