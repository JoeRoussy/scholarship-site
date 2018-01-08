import express from 'express';
import { isAdmin, applications, promos, createPromo, processCreatePromo } from '../controller/admin.js';
import { getChildLogger } from '../components/log-factory';
import { required } from '../components/custom-utils';
import { insert as insertInDb } from '../components/db/service';

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

    router.route('/promos/new')
        .get([
            isAdmin,
            createPromo
        ])
        .post([
            processCreatePromo({
                referralPromosCollection: db.collection('referralPromos'),
                insertInDb,
                logger: getChildLogger({
                    baseLogger,
                    additionalFields: {
                        module: 'admin-create-promo'
                    }
                })
            }),
            createPromo
        ]);

    app.use('/admin', router);
}
