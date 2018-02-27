import { login, signup, logout } from '../controller/auth';
import { required } from '../components/custom-utils';
import { getChildLogger } from '../components/log-factory';
import { sendMessage as sendMailMessage, getSignUpMailMessage } from '../components/mail-sender';

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

    // TODO: Should this not pass collections instead of the whole db?
    app.post('/signup', signup({
        db,
        sendMailMessage,
        getMailMessage: getSignUpMailMessage,
        logger: getChildLogger({
            baseLogger,
            additionalFields: {
                module: 'auth-signup'
            }
        })
    }));

    app.get('/logout', logout);
}
