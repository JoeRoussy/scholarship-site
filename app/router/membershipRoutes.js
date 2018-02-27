import express from 'express';
import { membership, processMembership, membershipAccept } from '../controller/membership';
import { required } from '../components/custom-utils';
import { getChildLogger } from '../components/log-factory';
import { sendMessage as sendMailMessage, getSignUpMailMessage, getMembershipAfterUpMailMessage } from '../components/mail-sender';

export default ({
    app = required('app'),
    db = required('db'),
    baseLogger = required('baseLogger')
}) => {
    const router = express.Router();

    router.get('/buy', processMembership({
        transactionsCollection: db.collection('transactions'),
        logger: getChildLogger({
            baseLogger,
            additionalFields: {
                module: 'membership-process'
            }
        })
    }));

    router.get('/success', membershipAccept({
        transactionsCollection: db.collection('transactions'),
        usersCollection: db.collection('users'),
        sendMailMessage,
        getSignUpMailMessage,
        getMembershipAfterUpMailMessage,
        logger: getChildLogger({
            baseLogger,
            additionalFields: {
                module: 'membership-accept'
            }
        })
    }));

    app.use('/membership', router);
}
