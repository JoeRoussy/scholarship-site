import bcrypt from 'bcrypt';
import config from '../../config';
import { wrap as coroutine } from 'co';
import { getDocById, getUserByEmail } from '../data';
import { insert as saveToDb } from '../db/service';
import passportLocal from 'passport-local';
import { required } from '../custom-utils';

const {
    saltRounds,
    local: {
        login: {
            strategy: loginStrategy,
            errorMessages: loginErrorMessages
        } = {}
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
        done(null, user._id)
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
        usernameField : 'email',
        passwordField : 'password',
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
}
