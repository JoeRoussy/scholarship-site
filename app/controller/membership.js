import { wrap as coroutine } from 'co';
import config from '../config';
import { insert as saveToDb, findAndUpdate } from '../components/db/service';
import {
    required,
    print,
    convertToObjectId,
    redirectToError
} from '../components/custom-utils';
import {
    checkout as paypalCheckout,
    accept as paypalAccept,
    getCheckoutExperiences,
    createCheckoutExperienceWithNoShipping
} from '../components/paypal-helper';
import { free } from '../components/populate-session';


// Process paypal payment for memberships
export const processMembership = ({
    transactionsCollection = required('transactionsCollection'),
    paypalTokensCollection = required('paypalTokensCollection'),
    logger = required('logger', 'You must pass a logging instance')
}) => coroutine(function* (req, res) {
    // See if there is a checkout experience that we can use
    let paypalCheckoutExperiences;
    let paypalCheckoutExperienceId;

    try {
        paypalCheckoutExperiences = yield getCheckoutExperiences({ paypalTokensCollection });
    } catch (e) {
        logger.error({err: e}, 'Error getting checkout experiences for paypal');

        return redirectToError('paypalGeneric', res);
    }

    let [ paypalCheckoutExperience ] = paypalCheckoutExperiences;

    if (paypalCheckoutExperience) {
        // We can use an id that already exists
        paypalCheckoutExperienceId = paypalCheckoutExperience.id;
    } else {
        // We need to make a new checkout experience and then reference that id
        try {
            const experienceCreationResponse = yield createCheckoutExperienceWithNoShipping({ paypalTokensCollection });

            paypalCheckoutExperienceId = experienceCreationResponse.id;
        } catch (e) {
            logger.error({err: e}, 'Error generating a checkout experience for paypal');

            return redirectToError('paypalGeneric', res);
        }
    }

    if (!paypalCheckoutExperienceId) {
        logger.error('Undefined paypal checkout experience after configuration');

        return redirectToError('paypalGeneric', res);
    }

    // Now that we have a checkout experience, send the user to paypal the checkout
    const {
        cost: subTotal,
        tax,
        name,
        description,
        transactionDescriptions
    } = config.membership;

    const {
        redirects: {
            membership: {
                return: returnUrl,
                cancel: cancelUrl
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
            returnUrl: returnUrl,
            cancelUrl: cancelUrl,
            experienceProfileId: paypalCheckoutExperienceId,
            paypalTokensCollection
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

                return redirectToError('paypalCheckout', res);
            });

    // Save a transaction to the database
    if (!req.user) {
        logger.error('No user in session when trying to redirect for paypal checkout');

        return redirectToError('paypalCheckout', res);
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

        return redirectToError('paypalCheckout', res);
    }

    return res.redirect(paypalRedirect);
});

export const membershipAccept = ({
    transactionsCollection = required('transactionsCollection'),
    paypalTokensCollection = required('paypalTokensCollection'),
    usersCollection = required('usersCollection'),
    logger = required('logger', 'You must pass a logging instance'),
    sendMailMessage = required('sendMailMessage'),
    getSignUpMailMessage = required('getSignUpMailMessage'),
    getMembershipAfterSignUpMailMessage = required('getMembershipAfterSignUpMailMessage')
}) => coroutine(function* (req, res) {
    const {
        paymentId,
        PayerID: payerId
    } = req.query;

    if (!paymentId || !payerId) {
        logger.error(req.query, 'Missing paymentId or PayerID from paypal accept redirect');

        return redirectToError('paypalAccept', res);
    }

    const {
        session: {
            membershipPayment: {
                unconfirmedTransactionId
            } = {}
        } = {},
        user: {
            _id: userId
        } = {}
    } = req;

    if (!unconfirmedTransactionId) {
        logger.error({ session: req.session }, 'Could not find unconfirmed transaction id in session');

        return redirectToError('paypalAccept', res);
    }

    if (!userId) {
        logger.error('Could not find an id for a logged in user when trying to confirm a paypal payment');

        return redirectToError('paypalNotLoggedIn', res);
    }

    let paypalAcceptResponse;

    try {
        paypalAcceptResponse = yield paypalAccept({
            paymentId,
            payerId,
            paypalTokensCollection
        });
    } catch (e) {
        logger.error({ err: e }, 'Error during paypal accept call');

        return redirectToError('paypalAccept', res);
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

        return redirectToError('paypalAccept', res);
    }

    // Update the user as a member
    let updatedUser;

    try {
        updatedUser = yield findAndUpdate({
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

        return redirectToError('paypalAccept', res);
    }

    // We need to send an email based on weather this is a new user also buying
    // a memebrship or if this is an existing user now buying a membership
    let mailMessage;
    let subject;

    if (req.session.isBuyingMembershipAndSigningUp) {
        mailMessage = getSignUpMailMessage({ user: updatedUser });
        free(req.session, 'isBuyingMembershipAndSigningUp');
        subject = 'Greetings from the Canada Higher Education House';
    } else {
        mailMessage = getMembershipAfterSignUpMailMessage({ user: updatedUser });
        subject = 'Thank you for upgrading to a full CHEH membership'
    }

    // Don't wait for the email to send because it takes a long time but still
    // log an error if something goes wrong.
    sendMailMessage({
        to: updatedUser.email,
        message: mailMessage,
        subject
    })
        .catch(e => {
            logger.error(e, { user: updatedUser }, 'Error sending membership mail message for user');
        });

    return res.redirect('/?paypalSuccess=true');
});
