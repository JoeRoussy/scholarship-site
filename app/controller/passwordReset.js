import { wrap as coroutine } from 'co';

import { required, convertToObjectId } from '../components/custom-utils';
import { getUserByEmail, getPasswordResetLink, getPasswordResetRequestByUrlIdentifier } from '../components/data';
import { generateHash } from '../components/authentication';
import { findAndUpdate } from '../components/db/service';
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

    // We are not yielding because sending emails takes too long. We write an error
    // if we can't send the reset email.
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
}) => coroutine(function* (req, res, next) {
    const {
        password,
        urlIdentifier,
        userId
    } = req.body;

    if (!password || !urlIdentifier || !userId) {
        logger.warn({ body: req.body }, 'Incomplete request body');
        res.locals.formHandlingError = true;

        return next();
    }

    // Make sure there is an active password update for this user under the given code
    let passwordResetDocument = null;

    try {
        passwordResetDocument = yield getPasswordResetRequestByUrlIdentifier({
            passwordResetRequestsCollection,
            urlIdentifier
        });
    } catch (e) {
        logger.error(e, `Error getting password reset request document for urlIdentifier: ${urlIdentifier}`);
        res.locals.formHandlingError = true;

        return next();
    }

    if (!passwordResetDocument && passwordResetDocument.userId.toString() !== userId) {
        logger.warn({ urlIdentifier, userId }, 'Attempted to process invalid password reset submission');
        res.locals.formHandlingError = true;

        return next();
    }

    // Update the user with the new password
    const newPassword = yield generateHash(password);
    let currentUser = null;

    try {
        currentUser = yield findAndUpdate({
            collection: usersCollection,
            query: {
                _id: convertToObjectId(userId)
            },
            update: {
                password: newPassword
            }
        });
    } catch (e) {
        logger.error(e, `Error saving new password for user with id: ${userId}`);
        res.locals.formHandlingError = true;

        return next();
    }

    // Update the password reset document as expired
    try {
        yield findAndUpdate({
            collection: passwordResetRequestsCollection,
            query: {
                urlIdentifier,
                userId: convertToObjectId(userId)
            },
            update: {
                expired: true
            }
        });
    } catch (e) {
        logger.error(e, `Error marking password reset as expried with urlIdentifier: ${urlIdentifier}`);
        res.locals.formHandlingError = true;

        return next();
    }

    // Log the user in
    req.login(currentUser, err => {
        if (err) {
            logger.error(err, `Error login in user after updating password. User id: ${userId}`);
            res.locals.formHandlingError = true;

            return next();
        }

        return res.redirect('/?passwordResetSuccess=true');
    });
});