import express from 'express';

import { getChildLogger } from '../components/log-factory';
import { required } from '../components/custom-utils';
import {
    index,
    processInitialRequest
} from '../controller/passwordReset';

export default ({
    app = required('app'),
    db = required('db'),
    baseLogger = required('baseLogger')
}) => {
    const router = express.Router();

    router.route('/')
        .get(index)
        .post([
            processInitialRequest({
                passwordResetRequestsCollection: db.collection('passwordResetRequests'),
                usersCollection: db.collection('users'),
                logger: getChildLogger({
                    baseLogger,
                    additionalFields: {
                        module: 'password-reset-initial-request'
                    }
                })
            }),
            index
        ]);

    app.use('/forgot-password', router);
};