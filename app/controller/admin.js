import { wrap as coroutine } from 'co';
import { getScholarshipApplicationsWithFilter } from '../components/data';
import { required, redirectToError, print, sortByDate } from '../components/custom-utils';
import { insertInDb } from '../components/db/service';

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

export const applications = ({
    applicationsCollection = required('applicationsCollection'),
    logger = required('logger', 'You must pass in a child logging instance')
}) => coroutine(function* (req, res) {

    const {
        userId,
        startDate,
        endDate
    } = req.query;

    let scholarshipApplications;

    try {
        scholarshipApplications = yield getScholarshipApplicationsWithFilter({
            scholarshipApplicationsCollection: applicationsCollection,
            userId,
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

        return res.render('scholarshipApplicationList', res.locals);
    }

    // Render the template with the applications
    res.locals.applications = scholarshipApplications.sort(sortByDate);

    res.locals.applications[0].isFirst = true;

    return res.render('scholarshipApplicationList', res.locals);
});

export const promos = ({

}) => coroutine(function* (req, res) {

    //TODO: Get all the referral promotions and add them to the locals
    // Redirect to an error if they cannot be found

    return res.render('promos', res.locals);
});

export const createPromo = (req, res) => res.render('createPromo');

export const processCreatePromo = ({
    referralPromosCollection = required('referralPromosCollection'),
    logger = required('logger', 'You must pass in a child logging instance'),
    insertInDb = required('insertInDb')
}) => coroutine(function* (req, res, next) {
    const {
        name,
        startDate: startDateAsNum,
        endDate: endDateAsNum
    } = req.body;

    if (!name || !startDateAsNum || !endDateAsNum) {
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
                eligibleUsers: []
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
