import config from '../config';
import passport from 'passport';
import moment from 'moment';
import { print, required } from '../components/custom-utils';
import { generateHash } from '../components/authentication';
import { wrap as coroutine } from 'co';
import { getUserByEmail, getUserByReferralCode } from '../components/data';
import { insert as saveToDb, findAndUpdate } from '../components/db/service';
import { get as getHash } from '../components/hash';
import { free } from '../components/populate-session';

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
    const hashedPassword = yield generateHash(password);
    const newUser = {
        email,
        password: hashedPassword,
        name,
        refId: getHash({ input: email })
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

    // Now that the user has been made, see if we need to credit anyone with a referral
    if (refId) {
        let referer = null;

        try {
            referer = yield getUserByReferralCode({
                usersCollection: db.collection('users'),
                refId
            });
        } catch (e) {
            // No need to mess this signup up because we could not find a referer
            logger.error(err.err, err.msg);
        }

        if (referer) {
            // Update any promos going on now to have this new user as eligible
            try {
                const now = new Date(moment().startOf('day').toISOString());

                yield findAndUpdate({
                    collection: db.collection('referralPromos'),
                    query: {
                        startDate: {
                            $lte: now
                        },
                        endDate: {
                            $gte: now
                        }
                    },
                    uniquePush: {
                        eligibleUsers: referer._id
                    }
                })
            } catch (e) {
                // Again, we don't want to break this sign in because we could not complete some referral assignment
                logger.error(e, `Could not update current promos with eligible user: ${referer._id}`);
            }
        }

        free(req.session, 'refId');
    }

    // Now that the user has been made, log them in
    req.login(savedUser, err => {
        if (err) {
            // This is a weird case where we want them to contact us.
            logger.error(e, 'Error logging in user');

            return res.redirect(`/?signupError=${signupErrorMessages.contact}`);
        }

        if (buyMemebership) {
            // We are logging in and trying to buy the membership right away
            return res.redirect('/membership/buy');
        }

        // We are just logging in without buying the membership
        return res.redirect('/');
    });
});

export const logout = (req, res) => {
    req.logout();

    return res.redirect('/');
}
