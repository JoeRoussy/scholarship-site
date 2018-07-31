import { wrap as coroutine } from 'co';

import { getFeaturedPromo } from '../data';
import { required } from '../custom-utils';

const func = ({
    referralPromosCollection = required('referralPromosCollection'),
    logger = required('logger', 'You need to pass in a logging funciton for this method to use')
}) => coroutine(function*(req, res, next) {
    if (!req.user) {
        // No need to see the featured promo
        return next();
    }

    try {
        res.locals.featuredPromo = yield getFeaturedPromo({ referralPromosCollection });
        res.locals.refId = req.user.refId;
    } catch (e) {
        logger.error(e, 'Error getting featured promos');

        // No need to mess with processing the required because of this
        return next();
    }

    return next();
});

export default func;