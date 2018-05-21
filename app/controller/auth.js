import config from '../config';
import passport from 'passport';
import { print, required } from '../components/custom-utils';
import { wrap as coroutine } from 'co';
import { insert as saveToDb, findAndUpdate } from '../components/db/service';
import { free } from '../components/populate-session';
import {
    getUserByEmail,
    getUserByReferralCode,
    attributeReferral,
    processReferrals,
    createUser
 } from '../components/data';


if (!config) {
    throw new Error('Could not find config!');
}

const {
    local: {
        login: {
            strategy: loginStrategy,
            errorMessages: loginErrorMessages
        } = {},
        signup: {
            errorMessages: signupErrorMessages
        } = {}
    } = {}
} = config.authentication;

export const login = ({
    passport = required('passport'),
    logger = required('logger', 'You must pass in a child logging instance')
}) => (req, res) => {
    const {
        email
    } = req.body;

    if (!email) {
        logger.warn('Got a request for login without an email');

        return res.redirect(`/?loginError=${loginErrorMessages.generic}`);
    }

    passport.authenticate(loginStrategy, (err, user, info) => {
        if (err) {
            logger.error(err, 'Error authenticating user');

            return res.redirect(`/?loginError=${loginErrorMessages.generic}`);
        }

        // See if the credentials were valid
        if (!user) {
            if (info) {
                const {
                    errorKey
                } = info;

                logger.info({
                    ...info,
                    email
                }, 'Issue with credentials when attempting login');
                let errorMessage = errorKey ? loginErrorMessages[errorKey] : loginErrorMessages.generic;

                return res.redirect(`/?loginError=${errorMessage}`);
            } else {
                // This is some weird state so return a general error
                logger.error('No user found after authenticating and no info object is present');

                return res.redirect(`/?loginError=${loginErrorMessages.generic}`);
            }
        }

        // Otherwise we have a valid user so we should try and log them in
        req.login(user, err => {
            if (err) {
                logger.error({
                    err: err,
                    ...user
                }, 'Error authenticating user');

                return res.redirect(`/?loginError=${loginErrorMessages.generic}`);
            }

            return res.redirect('/');
        });
    })(req, res);
};

export const signup = ({
    db = required('db'),
    logger = required('logger', 'You must pass in a child logging instance'),
    getMailMessage = required('getMailMessage'),
    sendMailMessage = required('sendMailMessage')
}) => coroutine(function* (req, res) {
    const {
        email,
        password,
        name,
        buyMemebership
    } = req.body;

    const {
        refId
    } = req.session;

    if (!email || !password || !name) {
        logger.warn(`Got a signup request with missing data email: ${email}, password: ${password}, name: ${name}`);

        return res.redirect(`/?signupError=${signupErrorMessages.generic}`);
    }

    // First see if a user with this email exists
    let user = null;

    try {
        user = yield getUserByEmail({
            usersCollection: db.collection('users'),
            email: email
        });
    } catch (e) {
        logger.error({
            err: e.err
        }, e.msg);

        return res.redirect(`/?signupError=${signupErrorMessages.generic}`);
    }

    if (user) {
        logger.info({
            email,
            name
        }, 'Signup attempt with existing email');

        return res.redirect(`/?signupError=${signupErrorMessages.existingEmail}`);
    }

    // No user exists with this email so lets make a user.
    let savedUser = null;

    try {
        savedUser = yield createUser({
            name,
            email,
            password,
            usersCollection: db.collection('users')
        });
    } catch (e) {
        logger.error({
            err: e,
            ...savedUser
        }, 'Error saving new user to db');

        return res.redirect(`/?signupError=${signupErrorMessages.generic}`);        
    }

    // Now that the user has been made, see if we need to credit anyone with a referral
    yield processReferrals({
        refId,
        req,
        usersCollection: db.collection('users'),
        referralPromosCollection: db.collection('referralPromos'),
        referralsCollection: db.collection('referrals'),
        newUser: savedUser
    });

    // Now that the user has been made, log them in
    req.login(savedUser, err => {
        if (err) {
            // This is a weird case where we want them to contact us.
            logger.error(e, 'Error logging in user');

            return res.redirect(`/?signupError=${signupErrorMessages.contact}`);
        }

        if (buyMemebership) {
            // We are logging in and trying to buy the membership right away. Let's
            // remember that in the session before redirecting to the memebrship buy
            // route
            req.session.isBuyingMembershipAndSigningUp = true;

            return res.redirect('/membership/buy');
        }

        // We are just logging in without buying the membership
        // Send an email welcoming the user before redirecting to home page
        const mailMessage = getMailMessage({ user: savedUser });

        // Don't wait until the message is sent because that takes a long time but log an error
        // if there is an issue sending the message
        sendMailMessage({
            to: savedUser.email,
            message: mailMessage,
            subject: 'Greetings from the Canada Higher Education House'
        })
            .catch(e => {
                logger.error(e, { user: savedUser }, 'Error sending welcome email for user');
            });


        return res.redirect('/');
    });
});

export const logout = (req, res) => {
    req.logout();

    return res.redirect('/');
}

// Take nessesary dependencies and returns a function that takes the new user and sends a welcome email to them
// Logging errors is left to the caller
export const sendWelcomeMessageToFacebookUser = ({
    getMailMessage = required('getMailMessage'),
    sendMailMessage = required('sendMailMessage')
}) => coroutine(function* (newUser) {
    const mailMessage = getMailMessage({ user: newUser });

    // TODO: This should have a catch that rethrows an error with some messaging. We can do this once we bring in the RethrownError class.
    return sendMailMessage({
        to: newUser.email,
        message: mailMessage,
        subject: 'Greetings from the Canada Higher Education House'
    });
});
