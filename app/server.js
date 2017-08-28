import express from 'express';
import language from './components/language';
import loadContentConfig from './components/content';
import loadConfigElements from './components/load-config';
import templateConfig from './components/template-config';
import appRouteConfig from './router/appRoutes.js';
import apiRouteConfig from './router/apiRoutes.js';
import { getLogger, getChildLogger } from './components/log-factory';
import dbConfig from './components/db/config';
import runDataImport from './components/db/data-import';

const app = express();

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

        app.use(express.static('public'));
        app.use(language);

        loadConfigElements(app);
        loadContentConfig(app);
        templateConfig(app);
        appRouteConfig({
            app,
            db
        });
        apiRouteConfig({
            app,
            db,
            baseLogger: Logger
        });

        // Comment this out if we do not want to run data import
        // TODO: Make this run based on an enviornment variable
        // runDataImport({
        //     spreadsheetPath: 'app/files/database_may_28.csv',
        //     baseLogger: Logger,
        //     collections: {
        //         provinces: db.collection('provinces'),
        //         universities: db.collection('universities'),
        //         programs: db.collection('programs')
        //     }
        // });

        app.listen(3000, () => Logger.info('App listening on port 3000'));
    })
    .catch(e => {
        dbLogger.error(e, 'Error connecting to database');
    });
