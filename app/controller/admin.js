import { wrap as coroutine } from 'co';
import { getScholarshipApplications } from '../components/data';
import { required, redirectToError, print } from '../components/custom-utils';

export const isAdmin = (req, res, next) => {
    if (req.user.isAdmin) {
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

    // Now render the template with the applications
    res.locals.applications = scholarshipApplications;

    return res.render('scholarshipApplicationList', res.locals);
});
