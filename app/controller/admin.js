import { wrap as coroutine } from 'co';
import { getScholarshipApplicationsWithFilter } from '../components/data';
import { required, redirectToError, print, sortByDate } from '../components/custom-utils';

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

    // First get all the scholarship applications
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
