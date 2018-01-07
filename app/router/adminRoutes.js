import express from 'express';
import { isAdmin, applications, promos, createPromo } from '../controller/admin.js';
import { getChildLogger } from '../components/log-factory';
import { required } from '../components/custom-utils';

export default ({
    app = required('app'),
    db = required('db'),
    baseLogger = required('baseLogger')
}) => {
    const router = express.Router();

    router.get('/applications', [
        isAdmin,
        applications({
            applicationsCollection: db.collection('scholarshipApplications'),
            logger: getChildLogger({
                baseLogger,
                additionalFields: {
                    module: 'admin-applications-view'
                }
            })
        })
    ]);

    router.get('/promos', [
        isAdmin,
        promos({

        })
    ]);

    router.get('/promos/new', [
        isAdmin,
        createPromo
    ]);

    app.use('/admin', router);
}
