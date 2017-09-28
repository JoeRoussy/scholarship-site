import config from '../config';
import passport from 'passport';
import { print, required } from '../components/custom-utils';
import { generateHash } from '../components/authentication';
import { wrap as coroutine } from 'co';
import { getUserByEmail } from '../components/data';
import { insert as saveToDb } from '../components/db/service';

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
    logger = required('logger', 'You must pass in a child logging instance')
}) => coroutine(function* (req, res) {
    const {
        email,
        password,
        name
    } = req.body;

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
    const hashedPassword = yield generateHash(password);
    const newUser = {
        email,
        password: hashedPassword,
        name
    };

    let savedUser = null;

    try {
        savedUser = yield saveToDb({
            collection: db.collection('users'),
            document: newUser,
            returnInsertedDocument: true
        });
    } catch (e) {
        logger.error({
            err: e,
            ...savedUser
        }, 'Error saving new user to db');

        return res.redirect(`/?signupError=${signupErrorMessages.generic}`);
    }

    // Now that the user has been made, log them in
    req.login(savedUser, err => {
        if (err) {
            // This is a weird case where we want them to contact us.
            logger.error(e, 'Error logging in user');

            return res.redirect(`/?signupError=${signupErrorMessages.contact}`);
        }

        return res.redirect('/');
    });
});

export const logout = (req, res) => {
    req.logout();

    return res.redirect('/');
}
