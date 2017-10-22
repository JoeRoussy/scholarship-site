import express from 'express';
import { membership, processMembership, membershipAccept } from '../controller/membership';
import { required } from '../components/custom-utils';
import { getChildLogger } from '../components/log-factory';

export default ({
    app = required('app'),
    db = required('db'),
    baseLogger = required('baseLogger')
}) => {
    const router = express.Router();

    router.get('/', membership);

    router.get('/buy', processMembership({
        transactionsCollection: db.collection('transactions'),
        logger: getChildLogger({
            baseLogger,
            additionalFields: {
                module: 'memberships-process'
            }
        })
    }));

    router.get('/success', membershipAccept({
        transactionsCollection: db.collection('transactions'),
        usersCollection: db.collection('users'),
        logger: getChildLogger({
            baseLogger,
            additionalFields: {
                module: 'memberships-accept'
            }
        })
    }));

    app.use('/membership', router);
}
