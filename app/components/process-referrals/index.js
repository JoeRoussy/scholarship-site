import { wrap as coroutine } from 'co';

import { required } from '../custom-utils';
import { processReferrals } from '../data';

// Processes a referral if "socialLogin" is in the qs.
// If it is present, we assume the current user is the referre and the refId in the session is the referrer.
// This function logs any errors under warn calls the next middleware is the referral cannot be processes
const middleware = ({
    usersCollection = required('usersCollection'),
    referralPromosCollection = required('referralPromosCollection'),
    referralsCollection = required('referralsCollection'),
    logger = required('logger', 'You must pass a logging instance into this function')
}) => coroutine(function* (req, res, next) {
    // First see if we are told to process a referral in the qs
    if (!req.query.socialLogin) {
        return next();
    }

    // Now that we know we are supposed to run, make sure there is a new user and a refId
    const newUser = req.user;
    const refId = req.session.refId;

    if (!refId) {
        // If there is no refId this user just signed up by themselves
        return next();   
    }

    if (!newUser) {
        // We would always expect there to be a new user in this case
        logger.warn('No new user found during referral processing');

        return next();
    }

    // Now that we have all the information we need, process the referral
    try {
        yield processReferrals({
            req,
            refId,
            newUser,
            usersCollection,
            referralPromosCollection,
            referralsCollection
        });
    } catch (e) {
        // We only log the error because not being able to process a referrals should not break the app
        logger.error(e, 'Error trying to process referrals');
    }

    return next();

});

export default middleware;