import { wrap as coroutine } from 'co';
import config from '../config';
import { required, buildUrl, print, convertToObjectId } from '../components/custom-utils';
import { insert as saveToDb, findAndUpdate } from '../components/db/service';
import {
    checkout as paypalCheckout,
    accept as paypalAccept,
    getCheckoutExperiences,
    createCheckoutExperienceWithNoShipping
} from '../components/paypal-helper';

export const membership = (req, res) => {
    return res.render('membership/index', res.locals);
};

// Process paypal payment for memberships
export const processMembership = ({
    transactionsCollection = required('transactionsCollection'),
    logger = required('logger', 'You must pass a logging instance')
}) => coroutine(function* (req, res) {
    // See if there is a checkout experience that we can use
    let paypalCheckoutExperiences;
    let paypalCheckoutExperienceId;

    try {
        paypalCheckoutExperiences = yield getCheckoutExperiences();
    } catch (e) {
        logger.error({err: e}, 'Error getting checkout experiences for paypal');

        // TODO: Render some error page
    }

    let [ paypalCheckoutExperience ] = paypalCheckoutExperiences;

    if (paypalCheckoutExperience) {
        // We can use an id that already exists
        paypalCheckoutExperienceId = paypalCheckoutExperience.id;
    } else {
        // We need to make a new checkout experience and the reference that id
        try {
            const experienceCreationResponse = yield createCheckoutExperienceWithNoShipping();

            paypalCheckoutExperienceId = experienceCreationResponse.id;
        } catch (e) {
            logger.error({err: e}, 'Error generating a checkout experience for paypal');

            // TODO: Render some error page
        }
    }

    if (!paypalCheckoutExperienceId) {
        logger.error('Undefined paypal checkout experience after configuration');

        // TODO: Render some error page
    }

    // Now that we have a checkout experience, send the user to paypal the checkout
    const {
        cost: subTotal,
        tax,
        name,
        description,
        transactionDescriptions,
        paypalUrls
    } = config.membership;

    const {
        redirects: {
            membership: {
                return: returnPath,
                cancel: cancelPath
            } = {}
        } = {}
    } = config.paypal;

    const total = subTotal * tax;
    const taxAmount = total - subTotal;

    const paypalTotal = total.toFixed(2);
    const paypalSubTotal = subTotal.toFixed(2);
    const paypalTaxAmount = taxAmount.toFixed(2);

    const paypalTransaction = {
        amount: {
                total: paypalTotal,
                currency: 'CAD',
                details: {
                    subtotal: paypalSubTotal,
                    tax: paypalTaxAmount
                }
            },
            item_list: {
                items: [
                    {
                        name,
                        price: paypalSubTotal,
                        tax: paypalTaxAmount,
                        currency: 'CAD',
                        quantity: 1,
                        description
                    }
                ]
            },
            description: transactionDescriptions.paypal
    };

    const paypalRedirect = yield paypalCheckout({
            transactions: [ paypalTransaction ],
            returnUrl: buildUrl(req, returnPath),
            cancelUrl: buildUrl(req, cancelPath),
            experienceProfileId: paypalCheckoutExperienceId
        })
            .then(response => {
                const {
                    links
                } = response;

                const redirectLink = links.reduce((previous, current) => {
                    if (current.rel === 'approval_url') {
                        return current;
                    }

                    return previous;
                }, null);

                return redirectLink.href;
            })
            .catch(err => {
                logger.error({ err }, 'Error during call to paypal checkout endpoint');

                // TODO: Redirect to some error
            });

    // Save a transaction to the database
    if (!req.user) {
        logger.error('No user in session when trying to redirect for paypal checkout');

        // TODO: Redirect to some error
    }

    try {
        const transaction = yield saveToDb({
            collection: transactionsCollection,
            document: {
                type: 'membership',
                paymentType: 'paypal',
                userId: req.user._id,
                completed: false
            },
            returnInsertedDocument: true
        });

        req.session.membershipPayment = {
            unconfirmedTransactionId: transaction._id
        };
    } catch (e) {
        logger.error({ err: e }, 'Error saving transaction to DB');

        // TODO: Render error
    }

    return res.redirect(paypalRedirect);
});

export const membershipAccept = ({
    transactionsCollection = required('transactionsCollection'),
    usersCollection = required('usersCollection'),
    logger = required('logger', 'You must pass a logging instance')
}) => coroutine(function* (req, res) {
    const {
        paymentId,
        PayerID: payerId
    } = req.query;

    if (!paymentId || !payerId) {
        logger.error(req.query, 'Missing paymentId or PayerID from paypal accept redirect');

        // TODO: Render an error
    }

    const {
        unconfirmedTransactionId
    } = req.session.membershipPayment;

    if (!unconfirmedTransactionId) {
        logger.error({ session: req.session }, 'Could not find unconfirmed transaction id in session');
    }

    let paypalAcceptResponse;

    try {
        paypalAcceptResponse = yield paypalAccept({
            paymentId,
            payerId
        });
    } catch (e) {
        logger.error({ err: e }, 'Error during paypal accept call');

        // TODO: Render an error
    }

    const userId = req.user._id;

    if (!userId) {
        logger.error('Could not find an id for a logged in user when trying to confirm a paypal payment');
    }

    // Update the transaction as completed
    try {
        const result = yield findAndUpdate({
            collection: transactionsCollection,
            query: {
                _id: convertToObjectId(unconfirmedTransactionId)
            },
            update: {
                completed: true,
                paymentId
            }
        });

        delete req.session.membershipPayment;
    } catch (e) {
        logger.error({ err: e, user: req.user }, 'Error updating membership transaction as complete');

        // TODO: Render some error
    }

    // Update the user as a member
    try {
        const result = yield findAndUpdate({
            collection: usersCollection,
            query: {
                _id: convertToObjectId(userId)
            },
            update: {
                isMember: true
            }
        });
    } catch (e) {
        logger.error({ err: e, user: req.user }, 'Error updating the user as a member');

        // TODO: Render some error
    }

    return res.render('membership/success', res.locals);
});
