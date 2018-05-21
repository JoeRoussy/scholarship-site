import bcrypt from 'bcrypt';
import config from '../../config';
import { wrap as coroutine } from 'co';
import { getDocById, getUserByEmail, createUser } from '../data';
import { insert as saveToDb } from '../db/service';
import passportLocal from 'passport-local';
import passportFacebook from 'passport-facebook';
import { required } from '../custom-utils';
import { sendMessage as sendMailMessage, getSignUpMailMessage } from '../mail-sender';

const FacebookStrategy = passportFacebook.Strategy;

const {
    saltRounds,
    local: {
        login: {
            strategy: loginStrategy,
            errorMessages: loginErrorMessages
        } = {}
    } = {},
    facebook: {
        appId: facebookAppId,
        secret: facebookAppSecret,
        callbackUrl: facebookCallbackUrl
    } = {}
} = config.authentication;

export const generateHash = async (password) => await bcrypt.hash(password, saltRounds);

export const comparePasswords = async (password, hash) => await bcrypt.compare(password, hash);

export default ({
    passport = required('passport'),
    db = required('db'),
    logger = required('logger', 'You must pass in a logger to this function'),
    onFacebookUserCreated
}) => {
    const LocalStrategy = passportLocal.Strategy;

    passport.serializeUser((user, done) => {
        done(null, user._id);
    });

    passport.deserializeUser(coroutine(function* (id, done) {
        let user = null;

        try {
            user = yield getDocById({
                collection: db.collection('users'),
                id
            });
        } catch (e) {
            return done(e, null);
        }

        return done(null, user);
    }));

    passport.use(loginStrategy, new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    }, coroutine(function* (email, password, done) {
        let user = null;

        try {
            user = yield getUserByEmail({
                usersCollection: db.collection('users'),
                email
            });
        } catch (e) {
            return done(e);
        }

        if (!user) {
            return done(null, false, {
                errorKey: loginErrorMessages.invalidEmail
            });
        }

        let isValidPassword = false;

        try {
            isValidPassword = yield comparePasswords(password, user.password);
        } catch (e) {
            return done(e);
        }

        if (!isValidPassword) {
            return done(null, false, {
                errorKey: loginErrorMessages.invalidPassword
            });
        }

        return done(null, user);
    })));

    passport.use(new FacebookStrategy({
        clientID: facebookAppId,
        clientSecret: facebookAppSecret,
        callbackURL: facebookCallbackUrl,
        profileFields:[ 'id','displayName','emails' ]
    }, coroutine(function* (accessToken, refreshToken, profile, done) {
        const {
            id: providerId,
            displayName,
            emails: [
                {
                    value: email
                } = {}
            ] = [],
            provider
        } = profile;

        // First, see if this user is in our database
        let facebookUser = null;

        // If we did not get an email we need to show an error
        if (!email) {
            return done({
                key: 'FACEBOOK_MISSING_EMAIL',
                message: 'Email is required to log in with facebook.'
            });
        }

        try {
            facebookUser = yield getUserByEmail({
                usersCollection: db.collection('users'),
                email
            });
        } catch (e) {
            return done(e);
        }

        if (facebookUser) {
            // This user has already signed in before with facebook and we have them in our db
            return done(null, facebookUser);
        }

        // This is a new user so we need to save them to the db
        let savedUser = null;

        try {
            savedUser = yield createUser({
                name: displayName,
                email,
                provider,
                providerId,
                usersCollection: db.collection('users')
            });
        } catch (e) {
            return done(e);   
        }

        // Now that a new user has been saved, call the onCreation method if we were passed one
        if (typeof onFacebookUserCreated === 'function') {
            onFacebookUserCreated(savedUser)
                .catch((e) => {
                    // If there is an error, do not hold up creation of the user because this functionality is not mission critical
                    // and may be a slow process (like sending an email)
                    // Instead we will just log an error
                    logger.error(e, 'Error sending email for new facebook user');
                })
        }

        // NOTE: Referrals will be processed in the success callback using middleware looking for the appropriate query parameter
        return done(null, savedUser);
    })));

}
