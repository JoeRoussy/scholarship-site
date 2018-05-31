import express from 'express';
import { getChildLogger } from '../components/log-factory';
import { required } from '../components/custom-utils';
import { insert as insertInDb } from '../components/db/service';
import {
    isAdmin,
    applications,
    promos,
    createPromo,
    processCreatePromo,
    index,
    populateUsersInPromo,
    userSearch,
    processUserSearch,
    userAnalytics
} from '../controller/admin.js';

export default ({
    app = required('app'),
    db = required('db'),
    baseLogger = required('baseLogger')
}) => {
    const router = express.Router();

    router.get('/', [
        isAdmin,
        index
    ]);

    router.route('/user-search')
        .get([
            isAdmin,
            userSearch({
                usersCollection: db.collection('users'),
                logger: getChildLogger({
                    baseLogger,
                    additionalFields: {
                        module: 'admin-user-search'
                    }
                })
            })
        ])
        .post([
            isAdmin,
            processUserSearch({
                usersCollection: db.collection('users'),
                logger: getChildLogger({
                    baseLogger,
                    additionalFields: {
                        module: 'admin-process-user-search'
                    }
                })
            })
        ]);

    router.get('/user-analytics', [
        isAdmin,
        userAnalytics({
            usersCollection: db.collection('users'),
            logger: getChildLogger({
                baseLogger,
                additionalFields: {
                    module: 'admin-process-user-search'
                }
            })
        })
    ]);

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
            referralPromosCollection: db.collection('referralPromos'),
            logger: getChildLogger({
                baseLogger,
                additionalFields: {
                    module: 'admin-promos-view'
                }
            })
        }),
        populateUsersInPromo({
            usersCollection: db.collection('users'),
            logger: getChildLogger({
                baseLogger,
                additionalFields: {
                    module: 'admin-promos-populate-winner-ids'
                }
            })
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
