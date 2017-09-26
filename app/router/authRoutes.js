import { login, signup, logout } from '../controller/auth';
import { required } from '../components/custom-utils';
import { getChildLogger } from '../components/log-factory';

export default ({
    app = required('app'),
    passport = requied('passport'),
    db = required('db'),
    baseLogger = required('baseLogger')
}) => {
    app.post('/login', login({
        passport,
        logger: getChildLogger({
            baseLogger,
            additionalFields: {
                module: 'auth-login'
            }
        })
    }));

    app.post('/signup', signup({
        db,
        logger: getChildLogger({
            baseLogger,
            additionalFields: {
                module: 'auth-signup'
            }
        })
    }));

    app.get('/logout', logout);
}
