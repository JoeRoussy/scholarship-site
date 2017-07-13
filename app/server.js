import express from 'express';
import language from './components/language';
import loadContentConfig from './components/content';
import templateConfig from './components/template-config';
import basicRouteConfig from './router/basicRoutes.js';
import searchRouteConfig from './router/searchRoutes.js';
import { getLogger, getChildLogger } from './components/log-factory';
import dbConfig from './components/db/config';

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
    .then(() => {
        // Now that we know the db is connected, continue setting up the app
        app.use(express.static('public'));
        app.use(language);

        loadContentConfig(app);
        templateConfig(app);
        basicRouteConfig(app);
        searchRouteConfig(app);

        app.listen(3000, () => Logger.info('App listening on port 3000'));
    })
    .catch(({ err, msg }) => {
        dbLogger.error(err, msg);
    });
