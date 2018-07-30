import Bluebird from 'bluebird';

import { wrap as coroutine } from 'co';
import { required, redirectToError, print, sortByDate, convertToObjectId } from '../components/custom-utils';
import { insertInDb } from '../components/db/service';
import { transformUserForOutput } from '../components/transformers';
import config from '../config';
import { formatForUserRegistraction, formatForScholarshipApplications } from '../components/graph-data-formatting';
import {
    getScholarshipApplicationsWithFilter,
    getAllReferralPromos,
    getDocById,
    getUsers,
    getNonAdminUsers,
    searchUserByEmailOrName,
    getNewUsersInPastTimeFrame,
    getTotalScholarshipApplicationCount,
    getYearlyScholarshipApplicationCount,
    getScholarshipApplicationsInPastTimeFrame
} from '../components/data';

const {
    admin: {
        defaultUserTimeseries: DEFAULT_USER_TIMESERIES
    } = {}
} = config;

if (!DEFAULT_USER_TIMESERIES) {
    throw new Error('Missing config elements for admin module');
}


export const isAdmin = (req, res, next) => {
    const {
        user: {
            isAdmin
        } = {}
    } = req;

    if (isAdmin) {
        return next();
    } else {
        return res.redirect('/');
    }
};

export const index = (req, res) => res.render('admin/index');

export const applications = ({
    applicationsCollection = required('applicationsCollection'),
    logger = required('logger', 'You must pass in a child logging instance')
}) => coroutine(function* (req, res) {

    const {
        name,
        startDate,
        endDate
    } = req.query;

    let scholarshipApplications;

    try {
        scholarshipApplications = yield getScholarshipApplicationsWithFilter({
            scholarshipApplicationsCollection: applicationsCollection,
            name,
            afterDate: startDate ? new Date(parseInt(startDate)) : null,
            beforeDate: endDate ? new Date(parseInt(endDate)) : null
        });
    } catch (e) {
        logger.error({err: e}, 'Error getting scholarship applications');

        return redirectToError('default', res);
    }

    if (!scholarshipApplications.length) {
        // If we have not found any applications render the page without any
        res.locals.applications = [];

        return res.render('admin/scholarshipApplicationList', res.locals);
    }

    // Render the template with the applications
    res.locals.applications = scholarshipApplications.sort(sortByDate);

    res.locals.applications[0].isFirst = true;

    return res.render('admin/scholarshipApplicationList', res.locals);
});

export const promos = ({
    referralPromosCollection = required('referralPromosCollection'),
    logger = required('logger', 'You must pass in a child logging instance')
}) => coroutine(function* (req, res, next) {
    let promos = [];

    try {
        promos = yield getAllReferralPromos({
            referralPromosCollection
        });
    } catch (e) {
        logger.error(e.err, e.msg);
    }

    res.locals.promos = promos;

    return next();
});

export const populateUsersInPromo = ({
    usersCollection = required('usersCollection'),
    logger = required('logger', 'You must pass in a child logging instance')
}) => coroutine(function* (req, res, next) {
    // Go through each res.locals.promos and populate the data for the referrals (which are in the winner ids)
    res.locals.promos = yield Bluebird.map(res.locals.promos, async function(promo) {
        if (!promo.contenderIds) {
            // No users to populate
            return promo;
        }

        const {
            contenderIds,
            ...promoProps
        } = promo;

        const contenders = await Bluebird.map(contenderIds, (winnerId) => getDocById({
            collection: usersCollection,
            id: winnerId
        }))
            .map(transformUserForOutput);

        return {
            contenders,
            ...promoProps
        };
    })
        .catch((e) => {
            logger.error(e, 'Error getting contenders for promo');

            // Render an error
            return next('Error getting contenders for promo');
        })
    

    return res.render('admin/promos', res.locals);
});

export const createPromo = (req, res) => res.render('admin/createPromo');

export const processCreatePromo = ({
    referralPromosCollection = required('referralPromosCollection'),
    logger = required('logger', 'You must pass in a child logging instance'),
    insertInDb = required('insertInDb')
}) => coroutine(function* (req, res, next) {
    const {
        name,
        startDate: startDateAsNum,
        endDate: endDateAsNum,
        threashold,
        isFeatured
    } = req.body;

    if (!name || !startDateAsNum || !endDateAsNum || !threashold) {
        res.locals.formHandlingError = true;
        logger.error(req.body, 'Missing required fields from form body');

        return next();
    }

    try {
        yield insertInDb({
            collection: referralPromosCollection,
            document: {
                name,
                startDate: new Date(parseInt(startDateAsNum)),
                endDate: new Date(parseInt(endDateAsNum)),
                eligibleUsers: [],
                threashold: +threashold,
                isFeatured: !!isFeatured
            }
        });
    } catch (e) {
        res.locals.formHandlingError = true;
        logger.error({ doc: req.body, err: e }, 'Error inserting new promo into db');

        return next();
    }

    res.locals.requestSuccess = true;

    return next();
});

// This is GET route so we are going to list all the users and render the page
export const userSearch = ({
    usersCollection = required('usersCollection'),
    logger = required('logger', 'You must pass a logging instance to this function')
}) => coroutine(function* (req, res, next) {
    let allUsersResult = [];

    try {
        allUsersResult = yield getUsers({ usersCollection });
    } catch (e) {
        logger.error(e, 'Error getting all users');

        // If this fails lets just return a 500
        return next(e);
    }

    res.locals.users = allUsersResult;

    return res.render('admin/userSearch');
});

// This is the POST route. We have either got a name or an email query and we need to set the result in res.locals
export const processUserSearch = ({
    usersCollection = required('usersCollection'),
    logger = required('logger', 'You must pass a logging instance to this function')
}) => coroutine(function* (req, res) {
    const {
        name,
        email
    } = req.body;

    if (!name && !email) {
        // We might as well not even be searching
        return res.redirect('/admin/user-search');
    }

    let users = [];

    try {
        users = yield searchUserByEmailOrName({
            usersCollection,
            name,
            email
        });
    } catch (e) {
        logger.error(e, `Error processing user search query for name: ${name} and email: ${email}`);
        res.locals.formError = true;

        return res.render('admin/userSearch');
    }

    res.locals = {
        ...res.locals,
        users,
        nameValue: name,
        emailValue: email
    };

    return res.render('admin/userSearch');
});

export const userAnalytics = ({
    usersCollection = required('usersCollection'),
    scholarshipApplicationsCollection = required('scholarshipApplicationsCollection'),
    logger = required('logger', 'You must pass a logging instance to this function')
}) => coroutine(function* (req, res, next) {
    const {
        timeFrame = DEFAULT_USER_TIMESERIES,
    } = req.query;

    // Find the count of users on the site, see how many are members
    let allUsers = [];

    try {
        allUsers = yield getNonAdminUsers({ usersCollection });
    } catch(e) {
        logger.error(e, 'Error getting all users');

        return next(e);
    }

    const members = allUsers.filter(x => x.isMember);
    const userCount = allUsers.length;
    const memberCount = members.length;
    const memberPercentage = (memberCount / userCount * 100).toFixed(0);

    // Find the number of users who joined over the given time frame - also see how many are members
    let newUsers = null;
    let userGraphData = null;

    try {
        newUsers = yield getNewUsersInPastTimeFrame({
            usersCollection,
            timeFrame
        });
    } catch (e) {
        logger.error(e, 'Error getting data about users joining');

        return next(e);
    }

    if (!newUsers.length) {
        res.locals.userData = [];
    } else {
        userGraphData = formatForUserRegistraction(newUsers);
    }

    // Find the scholarship applications overall and in the last year
    let allScholarshipApplicationsCount = null;
    let yearlyScholarshipApplicationsCount = null;

    try {
        allScholarshipApplicationsCount = yield getTotalScholarshipApplicationCount({
            scholarshipApplicationsCollection
        });
    } catch (e) {
        logger.error(e, 'Error getting count of all scholarship applications');

        return next(e);
    }

    try {
        yearlyScholarshipApplicationsCount = yield getYearlyScholarshipApplicationCount({
            scholarshipApplicationsCollection
        });
    } catch (e) {
        logger.error(e, 'Error getting count of all scholarship applications');

        return next(e);
    }

    // Find the applications in the given time frame
    let applicationsForTimeFrame = null;
    let applicationGraphData = null;

    try {
        applicationsForTimeFrame = yield getScholarshipApplicationsInPastTimeFrame({
            scholarshipApplicationsCollection,
            timeFrame
        });
    } catch (e) {
        logger.error(e, `Error getting scholarship application data for timeframe: ${timeFrame}`);

        return next(e);
    }

    if (applicationsForTimeFrame.length) {
        applicationGraphData = formatForScholarshipApplications(applicationsForTimeFrame);
    }
    
    res.locals.userCount = userCount;
    res.locals.memberCount = memberCount;
    res.locals.memberPercentage = memberPercentage;
    res.locals.userGraphData = userGraphData;

    res.locals.totalApplicationsCount = allScholarshipApplicationsCount;
    res.locals.yearlyApplicationsCount = yearlyScholarshipApplicationsCount;
    res.locals.applicationGraphData = applicationGraphData;

    return res.render('admin/analytics');
});

export const viewPromo = ({
    referralPromosCollection = required('referralPromosCollection'),
    logger = required('logger', 'You must pass in a logging instance for this function to use')
}) => coroutine(function* (req, res, next) {
    const {
        id: promoId
    } = req.params;

    if (!promoId) {
        logger.warn('Did not get promo id for viewing promo');

        return res.redirect('/');
    }

    let currentPromo = null;

    try {
        currentPromo = yield getDocById({
            collection: referralPromosCollection,
            id: convertToObjectId(promoId)
        });
    } catch (e) {
        logger.error(e, 'Error getting current promo');

        return next(e);
    }

    res.locals.promo = currentPromo;

    return res.render('admin/editPromo', res.locals);
});

export const editPromo = ({
    referralPromosCollection = required('referralPromosCollection'),
    logger = required('logger', 'You must pass in a logging instance for this function to use')
}) => coroutine(function* (req, res, next) {

});

