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
import templateConfig from './components/template-config';
import appRouteConfig from './router/appRoutes.js';
import apiRouteConfig from './router/apiRoutes.js';
import authRouteConfig from './router/authRoutes.js';
import memberRouteConfig from './router/membershipRoutes.js';
import adminRouteConfig from './router/adminRoutes.js';
import notFoundRouteConfig from './router/errorRoutes.js';
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
        // TODO: Use secure cookies in production along with setting 'trust proxy' to 1 on the app
         app.use(session({
            secret: config.session.secret,
            resave: false, // don't save the session if unmodified
            saveUninitialized: false, // don't create session until something stored
            store: new MongoStore({
                db,
                touchAfter: 24 * 3600 // Only update the session every 24 hours unless a modification to the session is made
            }),
            cookie: {
                secure: process.env.NODE_ENV === 'production', // Using secure cookie requires an https connection
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
        app.use(sessionPopulation(config.session.loadedQueryKeys))
        app.use(language);

        configureAuth({
            passport,
            db
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
        loadConfigElements(app);
        loadContentConfig(app);
        loadUser(app);
        templateConfig(app);
        app.use(exchangeRatePopulation({
            exchangeRatesCollection: db.collection('exchangeRates'),
            logger: getChildLogger({
                baseLogger: Logger,
                additionalFields: {
                    module: 'exchange-rate-population'
                }
            })
        }));
        app.use(pricingPopulation);
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

        // Configure the 404 route at the end
        notFoundRouteConfig({
            app
        });

        // Configure error handling
        app.use(errorHandler);

        if (config.db.shouldRunDataImport) {
            runDataImport({
                //spreadsheetPath: 'app/files/manitoba_draft_final_1_march_2018.csv',
                spreadsheetPath: 'app/files/saskatchewan_draft_final_1_march_2018.csv',
                //spreadsheetPath: 'app/files/Maritime_Provinces_draft_final_19_october.csv',
                //spreadsheetPath: 'app/files/British_Columbia_draft_final_12_november.csv',
                //spreadsheetPath: 'app/files/Alberta_draft_final_12_november.csv',
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
