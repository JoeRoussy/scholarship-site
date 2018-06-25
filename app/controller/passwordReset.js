import { wrap as coroutine } from 'co';

import { required } from '../components/custom-utils';
import { getUserByEmail, getPasswordResetLink, getPasswordResetRequestByUrlIdentifier } from '../components/data';
import { getPasswordResetMailMessage, sendMessage as sendMailMessage } from '../components/mail-sender';

export const index = (req, res) => res.render('resetPassword/index');


export const processInitialRequest = ({
    passwordResetRequestsCollection = required('passwordResetRequestsCollection'),
    usersCollection = required('usersCollection'),
    logger = required('logger', 'You need to pass a logging instance into this function')
}) => coroutine(function* (req, res, next) {
    const {
        email
    } = req.body;

    if (!email) {
        logger.warn('Trying to process with no email');

        res.locals.formHandlingError = true;

        return next();
    }

    // Make sure there is a user with this email
    let currentUser = null;

    try {
        currentUser = yield getUserByEmail({
            usersCollection,
            email
        });
    } catch (e) {
        logger.error(e, `Error getting user with email: ${email}`);
        res.locals.formHandlingError = true;

        return next();
    }

    if (!currentUser) {
        res.locals.formHandlingError = true;
        res.locals.invalidEmail = true;

        return next();
    }

    // Otherwise we are good to go so we should get a password reset link
    let passwordResetLink = null;

    try {
        passwordResetLink = yield getPasswordResetLink({
            passwordResetRequestsCollection,
            user: currentUser
        });
    } catch (e) {
        logger.error(e, `Could not get password reset link for user with email: ${email}`);
        res.locals.formHandlingError = true;

        return next();
    }

    if (!passwordResetLink) {
        logger.error('Did not get password reset link');
        res.locals.formHandlingError = true;

        return next();
    }

    // Send a password reset email with the link
    const passwordResetMailMessage = getPasswordResetMailMessage({
        user: currentUser,
        passwordResetLink
    });

    sendMailMessage({
        to: email,
        message: passwordResetMailMessage,
        subject: 'Canada Higher Education House Password Reset'
    })
        .catch(e => {
            logger.error(e, `Could not send password reset message to user with email: ${email}`);
        });

    // Set locals before yielding to the next middleware
    res.locals.request = {
        email
    };
    res.locals.requestSuccess = true;

    return next();
});


export const execute = ({
    passwordResetRequestsCollection = required('passwordResetRequestsCollection'),
    logger = required('logger', 'you must pass in a logging instance for this function to use')
}) => coroutine(function* (req, res, next) {
    const {
        code
    } = req.query;

    if (!code) {
        return next('Missing code parameter');
    }

    // Make sure there is a password reset element
    let passwordResetDocument = null;

    try {
        passwordResetDocument = yield getPasswordResetRequestByUrlIdentifier({
            passwordResetRequestsCollection,
            urlIdentifier: code
        });
    } catch (e) {
        logger.error(e, `Error getting password reset request document for urlIdentifier: ${code}`);

        return next(e);
    }

    if (!passwordResetDocument) {
        logger.warn({ code }, 'Could not find password reset request for code');

        return next('Invalid code parameter');
    }

    // Set the code and the userid in the locals
    res.locals.userId = passwordResetDocument.userId;
    res.locals.urlIdentifier = passwordResetDocument.urlIdentifier;

    return res.render('resetPassword/form');
});

export const processExecute = ({
    passwordResetRequestsCollection = required('passwordResetRequestsCollection'),
    usersCollection = required('usersCollection'),
    logger = required('logger', 'you must pass in a logging instance for this function to use')
}) => coroutine(function* (req, res) {
    // Get the password and userId out of the form body

    // Save update the given user with the new password

    // If things do bad, set local form error and reutrn next()

    // Otherwise redirect to the homepage with a Qs that triggers a notification
});