import bcrypt from 'bcrypt-nodejs';
import config from '../config';
import { wrap as coroutine } from 'co';
import { getDocById, getUserByEmail } from '../data';
import { insert as saveToDb } from '../db/service';
import passportLocal from 'passport-local';


async function generateHash(password) {
    return await bcrypt.hash(password, config.authentication.saltRounds);
}

async function comparePasswords(password, hash) {
    return await bycrypt.compare(password, hash);
}

export default passport => {
    const LocalStrategy = passportLocal.Strategy;

    passport.serializeUser((user, done) => {
        done(null, user._id)
    });

    passport.deserializeUser(coroutine(function* (id, done) {
        let user = null;

        try {
            user = yield getDocById({
                collection: 'user',
                id
            });
        } catch (e) {
            return done(e, null);
        }

        return done(null, user);
    }));

    passport.use(config.authentication.local.signUpStrategy, new LocalStrategy({}, coroutine(function* (username, password, done) {
        // First see if a user with this username exists
        let user = null;

        try {
            user = await getUserByEmail({
                usersCollection,
                email: username
            });
        } catch (e) {
            return done(e);
        }

        if (user) {
            // TODO: Throw an error saying that a user with this email already exists
        }

        // No User esists with this email so lets make a user.
        const hashedPassword = yield generateHash(password);
        const newUser = {
            username,
            password
        };

        try {
            yield saveToDb(newUser);
        } catch (e) {
            return done(e);
        }

        return done(null, newUser);
    })));

    passport.use(config.authentication.local.loginStrategy, new LocalStrategy({}. coroutine(function* (username, password, done) {
        const user = null;

        try {
            user = await getUserByEmail({
                usersCollection,
                email: username
            });
        } catch (e) {
            return done(e);
        }

        if (!user) {
            // There was no user found, return this error
        }

        const isValidPassword = yield comaprePasswords(password, user.password);

        if (!isValidPassword) {
            // Invalid password, so return this error
        }

        return done(null, user);
    })));
}
