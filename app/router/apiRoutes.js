import express from 'express';
import { programSearch, getProgramById } from '../controller/api.js';
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

    app.use('/api', router);
}
