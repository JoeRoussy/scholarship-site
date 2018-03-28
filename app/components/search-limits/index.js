// Provides a middleware function that only lets a user use their monthly quota of searches
// Paided Members: unlimited
// Non-paid members: 30 per month
// Vistors: 3 per month
// Note that these values are defined in the config file

import { wrap as coroutine } from 'co';
import { required, convertToObjectId } from '../custom-utils';
import { insert, findAndUpdate } from '../db/service';
import { getSearchForUserId, getDocById } from '../data';

import config from '../../config';

const {
    searchCounting: {
        errors: {
            general: GENERAL_ERROR = required('general', 'Need to add this in the config'),
            overQuota: OVER_QUOTA_ERROR = required('overQuota', 'Need to add this in the config')       
        } = {},
        visitorLimit = required('visitorLimit', 'Need to add this in the config'),
        userLimit = required('userLimit', 'Need to add this in the config')
    } = {}
} = config;

export const middleware = ({
    searchesCollection = required('searchesCollection'),
    logger = required('logger', 'You must pass in a logging instance to this function')
}) => coroutine(function* (req, res, next) {
    let searchCounterDocument;

    if (req.user) {
        // We do not want to be working off of a search id in the session if we have someone signed in
        delete req.session.searchCounterId;

        // Members do not have any restrictions
        if (req.user.isMember) {
            return next();
        }

        // We are going to check the counter in the searches directly by user id
        try {
            searchCounterDocument = yield getSearchForUserId({
                searchesCollection,
                userId: convertToObjectId(req.user._id) 
            });
        } catch (e) {
            const errorMessage = `Error finding searches document for user with id: ${req.user._id}`;
            logger.error(e, errorMessage);

            return next({
                key: GENERAL_ERROR,
                message: errorMessage
            });
        }

        if (!searchCounterDocument) {
            // If this user does not have a search counter document we need to make them one
            try {
                searchCounterDocument = yield createNewSearchesDocument(searchesCollection, req.user._id);
            } catch (e) {
                logger.error(e, 'Error creating search counter document');

                return next({
                    key: GENERAL_ERROR,
                    message: 'Error creating search counter document'
                });
            }

            return next();  
        } else {
            // This user already had a search counter document so we need to check the count and increment it of we are still under
            if (searchCounterDocument.count >= userLimit) {
                return next({
                    key: OVER_QUOTA_ERROR,
                    message: 'Current user is not allowed to execute any more searches'
                });
            } else {
                // Need to increment the counter and let the user continue with their search
                return yield incrementSearchCount({
                    searchesCollection,
                    searchCounterDocument,
                    next,
                    logger
                });
            }
        }
    } else {
        // There is no user logged in and we need to resort to the session
        if (req.session.searchCounterId) {
            // This user has visited before so we need to get the search document and act based on that
            try {
                searchCounterDocument = yield getDocById({
                    collection: searchesCollection,
                    id: convertToObjectId(req.session.searchCounterId)
                });
            } catch (e) {
                const errorMessage = `Error getting search counter document with id: ${req.session.searchCounterId}`
                logger.error(e, errorMessage);

                return next({
                    key: GENERAL_ERROR,
                    message: errorMessage
                });
            }

            if (!searchCounterDocument) {
                // The counter id in the session is wrong so delete it and return a general error
                delete req.session.searchCounterId;

                return next({
                    key: GENERAL_ERROR,
                    message: 'Could not find a search counter document using the id in the sesssion'
                });
            }

            if (searchCounterDocument.count >= visitorLimit) {
                return next({
                    key: OVER_QUOTA_ERROR,
                    message: 'Current user is not allowed to execute any more searches'
                });
            } else {
                // Need to increment the counter and let the user continue with their search
                return yield incrementSearchCount({
                    searchesCollection,
                    searchCounterDocument,
                    next,
                    logger
                });
            }
        } else {
            // This is a new visitor so we need to make a search document for them and set the search counter in the session
            try {
                searchCounterDocument = yield createNewSearchesDocument(searchesCollection);
            } catch (e) {
                logger.error(e, 'Error creating search counter document');

                return next({
                    key: GENERAL_ERROR,
                    message: 'Error creating search counter document'
                });
            }

            req.session.searchCounterId = searchCounterDocument._id;

            return next();
        }
    }
});

// Makes a new search counter and returns the promise for its creation. Will assign it to a userId if it is provided
function createNewSearchesDocument(searchesCollection, userId) {
    return insert({
        collection: searchesCollection,
        document: {
            userId: convertToObjectId(userId),
            count: 1
        },
        returnInsertedDocument: true
    });
}

// Increments the count field of a given search document.
// Then calls next based on the success of the update call.
const incrementSearchCount = async({
    searchesCollection,
    searchCounterDocument,
    next,
    logger
}) => {
    try {
        await findAndUpdate({
            collection: searchesCollection,
            query: {
                _id: convertToObjectId(searchCounterDocument._id)
            },
            update: {
                count: ++searchCounterDocument.count
            }
        });
    } catch (e) {
        const errorMessage = `Error incrementing the search counter for counter document with id: ${searchCounterDocument._id}`;
        logger.error(e, errorMessage);

        return next({
            key: GENERAL_ERROR,
            message: errorMessage
        });
    }

    return next();
}

// Renders a page based on 
export const handleError = ({
    logger = required('logger', 'You must pass in a logging instance for this function to use')
}) => (err, req, res, next) => {
    if (err.key === GENERAL_ERROR) {

        // We should just redirect to the homepage with a flag for showing a toast
        return res.redirect('/?searchError=true');
    } else if (err.key === OVER_QUOTA_ERROR) {
        // Lets render the error page with a message about the fact that user is over quota
        res.locals.overQuota = true;
        res.locals.programs = [];

        return res.render('search', res.locals);
    } else {
        logger.error({ error: err }, 'Invalid error for search limit middleware.');

        return res.status(500).json({
            error: true,
            message: 'Your request could not be processed'
        });
    }
};