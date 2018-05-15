import bcrypt from 'bcrypt';
import config from '../../config';
import { wrap as coroutine } from 'co';
import { getDocById, getUserByEmail } from '../data';
import { insert as saveToDb } from '../db/service';
import passportLocal from 'passport-local';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { required } from '../custom-utils';

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
    db = required('db')
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

        // NOTE: Referrals will be processed in the success callback using middleware looking for the appropriate query parameter
        return done(null, facebookUser);
    })));

}
