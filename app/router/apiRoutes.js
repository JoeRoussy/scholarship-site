import express from 'express';
import {
    programSearch,
    getProgramById,
    universitiesSearch,
    getUniversityById,
    usersSearch,
    promoWinnerGeneration,
    deleteProfile,
    getPersonalData
} from '../controller/api.js';
import { isAdmin } from '../controller/admin.js';
import { getChildLogger } from '../components/log-factory';
import { required } from '../components/custom-utils';

export default ({
    app = required('app'),
    db = required('db'),
    baseLogger = required('baseLogger')
}) => {
    const router = express.Router();

    router.get('/programs', programSearch({
        provincesCollection: db.collection('provinces'),
        universitiesCollection: db.collection('universities'),
        programsCollection: db.collection('programs'),
        logger: getChildLogger({
            baseLogger,
            additionalFields: {
                module: 'api-program-search'
            }
        })
    }));

    router.get('/programs/:id', getProgramById({
        programsCollection: db.collection('programs'),
        logger: getChildLogger({
            baseLogger,
            additionalFields: {
                module: 'api-get-program-by-id'
            }
        })
    }));

    router.get('/universities', universitiesSearch({
        provincesCollection: db.collection('provinces'),
        universitiesCollection: db.collection('universities'),
        logger: getChildLogger({
            baseLogger,
            additionalFields: {
                module: 'api-universities-search'
            }
        })
    }));

    router.get('/universities/:id', getUniversityById({
        universitiesCollection: db.collection('universities'),
        logger: getChildLogger({
            baseLogger,
            additionalFields: {
                module: 'api-get-university-by-id'
            }
        })
    }));

    router.get('/users', [
        isAdmin,
        usersSearch({
            usersCollection: db.collection('users'),
            scholarshipApplicationsCollection: db.collection('scholarshipApplications'),
            logger: getChildLogger({
                baseLogger,
                additionalFields: {
                    module: 'api-users-search'
                }
            })
        })
    ]);

    router.delete('/users/me', deleteProfile({
        usersCollection: db.collection('users'),
        referralsCollection: db.collection('referrals'),
        logger: getChildLogger({
            baseLogger,
            additionalFields: {
                module: 'api-users-delete-profile'
            }
        })
    }));

    router.get('/users/me/personal-data', getPersonalData({
        usersCollection: db.collection('users'),
        logger: getChildLogger({
            baseLogger,
            additionalFields: {
                module: 'api-users-get-personal-data'
            }
        })
    }));

    router.get('/promo/:promoId/winner', promoWinnerGeneration({
        referralPromosCollection: db.collection('referralPromos'),
        referralsCollection: db.collection('referrals'),
        logger: getChildLogger({
            baseLogger,
            additionalFields: {
                module: 'api-promo-winner-generation'
            }
        })
    }));

    app.use('/api', router);
};
