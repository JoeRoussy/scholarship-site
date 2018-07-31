import express from 'express';
import session from 'express-session';
import connectMongo from 'connect-mongo';
import passport from 'passport';
import bodyParser from 'body-parser';
import config from './config';
import language from './components/language';
import loadContentConfig from './components/content';
import loadRequest from './components/load-request';
import loadConfigElements from './components/load-config';
import loadUser from './components/load-user';
import processReferrals from './components/process-referrals';
import templateConfig from './components/template-config';
import appRouteConfig from './router/appRoutes.js';
import apiRouteConfig from './router/apiRoutes.js';
import authRouteConfig from './router/authRoutes.js';
import memberRouteConfig from './router/membershipRoutes.js';
import adminRouteConfig from './router/adminRoutes.js';
import notFoundRouteConfig from './router/errorRoutes.js';
import passwordResetRouteConfig from './router/passwordReset.js';
import { errorHandler } from './controller/app.js';
import { getLogger, getChildLogger } from './components/log-factory';
import dbConfig from './components/db/config';
import runDataImport from './components/db/data-import';
import configureAuth from './components/authentication';
import { print } from './components/custom-utils';
import queryParamsPopulation from './components/populate-query-params';
import { middleware as sessionPopulation } from './components/populate-session';
import exchangeRatePopulation from './components/exchange-rate-population';
import pricingPopulation from './components/pricing-population';
import { sendMessage as sendMailMessage, getSignUpMailMessage } from './components/mail-sender';
import { sendWelcomeMessageToExternalLoginUser } from './controller/auth';
import setCaslCheck from './components/set-check-for-casl';
import configureFeaturedPromo from './components/configure-featured-promo';

const app = express();
const MongoStore = connectMongo(session); // mongodb session store

global.Logger = getLogger({
    name: 'scholarship-site'
});

const dbLogger = getChildLogger({
    baseLogger: Logger,
    additionalFields: {
        module: 'db-config'
    }
});

dbConfig()
    .then((db) => {
        if (!db) {
            dbLogger.error(null, 'Got null or undefinded for the db connection from the db config');
            return;
        }

        // Now that we know the db is connected, continue setting up the app
         app.use(session({
            secret: config.session.secret,
            resave: false, // don't save the session if unmodified
            saveUninitialized: false, // don't create session until something stored
            store: new MongoStore({
                db,
                touchAfter: 24 * 3600 // Only update the session every 24 hours unless a modification to the session is made
            }),
            cookie: {
                maxAge: 30 * 24 * 3600 * 1000 // Cookie identifiying session expires in one month (value passed in milliseconds)
            }
        }));
        app.use(passport.initialize());
        app.use(passport.session());
        app.use(express.static('public'));
        app.use(bodyParser.urlencoded({
            extended: true
        }));
        app.use(bodyParser.json());
        app.use(sessionPopulation(config.session.loadedQueryKeys));
        loadConfigElements(app);
        app.use(language);

        // It is important to load the content first in case we need to redner an error page
        app.use(exchangeRatePopulation({
            exchangeRatesCollection: db.collection('exchangeRates'),
            logger: getChildLogger({
                baseLogger: Logger,
                additionalFields: {
                    module: 'exchange-rate-population'
                }
            })
        }));
        loadContentConfig(app);
        app.use(pricingPopulation);

        configureAuth({
            passport,
            db,
            onExternalSignup: sendWelcomeMessageToExternalLoginUser({
                getMailMessage: getSignUpMailMessage,
                sendMailMessage    
            }),
            logger: getChildLogger({
                baseLogger: Logger,
                additionalFields: {
                    module: 'core-passport-auth'
                }
            })
        });
        authRouteConfig({
            app,
            passport,
            db,
            baseLogger: Logger
        });

        loadRequest(app);
        queryParamsPopulation({
            app,
            db,
            logger: getChildLogger({
                baseLogger: Logger,
                additionalFields: {
                    module: 'populate-query-params'
                }
            })
        });
        loadUser(app);
        templateConfig(app);
        app.use(processReferrals({
            usersCollection: db.collection('users'),
            referralPromosCollection: db.collection('referralPromos'),
            referralsCollection: db.collection('referrals'),
            logger: getChildLogger({
                baseLogger: Logger,
                additionalFields: {
                    module: 'third-part-sign-in-referral-promotion'
                }
            })
        }));
        app.use(setCaslCheck);
        app.use(configureFeaturedPromo({
            referralPromosCollection: db.collection('referralPromos'),
            logger: getChildLogger({
                baseLogger: Logger,
                additionalFields: {
                    module: 'configure-featured-promo'
                }
            })
        }));
        appRouteConfig({
            app,
            db
        });
        apiRouteConfig({
            app,
            db,
            baseLogger: Logger
        });
        memberRouteConfig({
            app,
            db,
            baseLogger: Logger
        });
        adminRouteConfig({
            app,
            db,
            baseLogger: Logger
        });
        passwordResetRouteConfig({
            app,
            db,
            baseLogger: Logger
        });

        // Configure the 404 route at the end
        notFoundRouteConfig({
            app
        });

        // Configure error handling
        app.use(errorHandler);

        if (config.db.shouldRunDataImport) {
            // NOTE: Current file for each province is left commented out to make full data import easier
            runDataImport({
                spreadsheetPath: 'app/files/manitoba_draft_final_1_march_2018.csv',
                //spreadsheetPath: 'app/files/ontario_draft_final_1_march_2018.csv',
                //spreadsheetPath: 'app/files/quebec_draft_final_1_march_2018.csv',
                //spreadsheetPath: 'app/files/saskatchewan_draft_final_1_march_2018.csv',
                //spreadsheetPath: 'app/files/Maritime_Provinces_draft_final_19_october.csv',
                //spreadsheetPath: 'app/files/British_Columbia_draft_final_12_november.csv',
                //spreadsheetPath: 'app/files/Alberta_draft_final_12_november.csv'
                baseLogger: Logger,
                collections: {
                    provinces: db.collection('provinces'),
                    universities: db.collection('universities'),
                    programs: db.collection('programs')
                }
            });
        }

        app.listen(3000, () => Logger.info('App listening on port 3000'));
    })
    .catch(e => {
        dbLogger.error(e, 'Error connecting to database');
    });
