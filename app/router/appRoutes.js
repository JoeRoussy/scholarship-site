import {
    search,
    setupSearchPagination,
    home,
    error,
    studyingInCanada,
    contact,
    programDetails,
    processContact,
    scholarshipApplication,
    processScholarshipApplication,
    profile,
    editProfile,
    processEditProfile,
    editPassword,
    processEditPassword,
    privacyPolicy,
    markFavorites
} from '../controller/app.js';
import { required } from '../components/custom-utils';
import { getChildLogger } from '../components/log-factory';
import {
    sendMessage as sendMailMessage,
    getContactMailMessage,
    getApplicationMailMessage,
    getApplicationConfirmationMailMessage
} from '../components/mail-sender';
import { insert as insertInDb } from '../components/db/service';
import { middleware as searchLimitMiddleware, handleError as handleSearchError } from '../components/search-limits';

export default ({
    app = required('app'),
    db = required('db')
}) => {

    app.get('/', home);

    app.get('/error', error);

    app.get('/studying-in-canada', studyingInCanada);

    app.route('/contact')
        .get(contact)
        .post([
            processContact({
                contactCollection: db.collection('contactSubmissions'),
                sendMailMessage,
                getMailMessage: getContactMailMessage,
                insertInDb
            }),
            contact
        ]);

    app.route('/search')
        .get([
            searchLimitMiddleware({
                searchesCollection: db.collection('searches'),
                logger: getChildLogger({
                    baseLogger: Logger,
                    additionalFields: {
                        module: 'search-limit'
                    }
                })
            }),
            search({
                provincesCollection: db.collection('provinces'),
                universitiesCollection: db.collection('universities'),
                programsCollection: db.collection('programs')
            }),
            markFavorites({
                favoriteProgramsCollection: db.collection('favoritePrograms'),
                logger: getChildLogger({
                    baseLogger: Logger,
                    additionalFields: {
                        module: 'search-mark-favorites'
                    }
                })
            }),
            setupSearchPagination,
            handleSearchError({
                logger: getChildLogger({
                    baseLogger: Logger,
                    additionalFields: {
                        module: 'search-limit-errors'
                    }
                })
            })
        ]);

    app.get('/programs/:programId', programDetails({
        programsCollection: db.collection('programs'),
        favoriteProgramsCollection: db.collection('favoritePrograms'),
        logger: getChildLogger({
            baseLogger: Logger,
            additionalFields: {
                module: 'program-details'
            }
        })
    }));

    app.route('/scholarship-application')
        .get(scholarshipApplication(db.collection('scholarshipApplications')))
        .post([
            processScholarshipApplication({
                scholarshipApplicationCollection: db.collection('scholarshipApplications'),
                sendMailMessage,
                getSystemMailMessage: getApplicationMailMessage,
                getUserMailMessage: getApplicationConfirmationMailMessage,
                insertInDb
            }),
            scholarshipApplication() // We don't pass in the applications collection because we don't need to check for previous applications when we are rendering the success view
        ]);

    app.get('/profile', profile({
        usersCollection: db.collection('users'),
        referralsCollection: db.collection('referrals'),
        referralPromosCollection: db.collection('referralPromos'),
        transactionsCollection: db.collection('transactions'),
        favoriteProgramsCollection: db.collection('favoritePrograms'),
        logger: getChildLogger({
            baseLogger: Logger,
            additionalFields: {
                module: 'profile-index'
            }
        })
    }));

    app.route('/profile/edit')
        .get(editProfile)
        .post([
            processEditProfile({
                usersCollection: db.collection('users'),
                logger: getChildLogger({
                    baseLogger: Logger,
                    additionalFields: {
                        module: 'profile-edit'
                    }
                })
            }),
            editProfile
        ]);

    app.route('/profile/edit/password')
        .get(editPassword)
        .post([
            processEditPassword({
                usersCollection: db.collection('users'),
                logger: getChildLogger({
                    baseLogger: Logger,
                    additionalFields: {
                        module: 'profile-edit-password'
                    }
                })
            }),
            editPassword
        ]);

    app.get('/privacy-policy', privacyPolicy);
};
