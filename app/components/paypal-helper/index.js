
import querystring from 'querystring';
import request from 'request-promise';
import { required } from '../custom-utils';
import config from '../../config';

// TODO: Would be nice to have better error handling in this module

const {
    host: gatewayEndpoint,
    clientId,
    secret,
    endpoints: {
        checkout: checkoutEndpoint,
        getAccept: getAcceptEndpoint,
        checkoutExperiences: checkoutExperiencesEndpoint
    } = {}
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
    experienceProfileId = required('experienceProfileId')
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
            defaultRequestParams
        }
    });
};

export const accept = ({
    paymentId = required('paymentId'),
    payerId = required('payerId')
}) => {
    return makeGatewayRequest({
        request: getAcceptEndpoint(paymentId),
        token,
        body: {
            payer_id: payerId
        }
    });
};

export const createCheckoutExperienceWithNoShipping = () => makeGatewayRequest({
    request: checkoutExperiencesEndpoint,
    token,
    body: PaypalConfig.createCheckoutExperienceWithNoShippingPayload
});

export const getCheckoutExperiences = () => makeGatewayRequest({
    method: 'GET',
    request: checkoutExperiencesEndpoint,
    token
});

const authenticateGatewayRequest = ({
    clientId,
    secret
}) => {
    const token = new Buffer(`${clientId}:${secret}`).toString('base64');
    const body = {
        grant_type: 'client_credentials'
    };

    return Request({
        uri: `${gatewayEndpoint}/v1/oauth2/token`,
        method: 'POST',
        headers: {
            "Authorization": `Basic ${token}`,
            "Accept": "application/json",
            "Content-Type": 'application/x-www-form-urlencoded'
        },
        body: querystring.stringify(body)
    })
        .then(response => JSON.parse(response))
        .then(response => response.access_token)
        .catch(err => {
            // TODO: Normalize this error
            throw new Error(err);
        });
}

const makeGatewayRequest = ({
    request,
    token,
    body,
    method = 'POST'
}) => authenticateGatewayRequest(token)
    .then(accessToken => Request({
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
