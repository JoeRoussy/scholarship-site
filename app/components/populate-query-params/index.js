import { wrap as coroutine } from 'co';
import { required } from '../custom-utils';
import { getDocById } from '../data';

// Adds middleware to the app that will populate objects based on information in the query string
export default ({
    app = requird('app'),
    db = required('db'),
    logger = required('logger', 'You must pass in a logging instance')
}) => {
    app.use(coroutine(function* (req, res, next) {
        const {
            userId
        } = req.query;

        res.locals.populatedQueryObjects = {};

        if (userId) {
            let user = null;

            try {
                user = yield getDocById({
                    collection: db.collection('users'),
                    id: userId
                });
            } catch (e) {
                logger.error(e, 'Error populating user in the query object');
            }

            if (user) {
                res.locals.populatedQueryObjects.user = user;
            }
        }

        return next();
    }))
}
