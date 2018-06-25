import { wrap as coroutine } from 'co';

import { required } from '../components/custom-utils';
import { getUserByEmail, getPasswordResetLink } from '../components/data';
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