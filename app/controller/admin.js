import { wrap as coroutine } from 'co';
import { getScholarshipApplications } from '../components/data';
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

    // First get all the scholarship applications
    let scholarshipApplications;

    try {
        scholarshipApplications = yield getScholarshipApplications({
            applicationsCollection
        });
    } catch (e) {
        logger.error({err: e}, 'Error getting scholarship applications');

        return redirectToError('default', res);
    }

    // Add a first marker to the start of the applications
    scholarshipApplications[0].isFirst = true;

    // Now render the template with the applications
    res.locals.applications = scholarshipApplications.sort(sortByDate);

    // print(res.locals.page);

    return res.render('scholarshipApplicationList', res.locals);
});
