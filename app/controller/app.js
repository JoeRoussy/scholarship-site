import { wrap as coroutine } from 'co';
import { getProgramsWithFilter, getProgramById, countProgramsForFilter } from '../components/data';
import { ObjectId } from 'mongodb';
import { transformProgramForOutput } from '../components/transformers';
import { print, sortByKey, required } from '../components/custom-utils';
import config from '../config';

if (!config) {
    throw new Error('Could not load config');
}

export const search = ({
    provincesCollection = required('provincesCollection', 'You must pass in the provinces db collection'),
    universitiesCollection = required('universitiesCollection', 'You must pass in the universities db collection'),
    programsCollection = required('programsCollection', 'You must pass in the programs db collection'),
}) => coroutine(function* (req, res, next) {
    const {
        province,
        university,
        name,
        provinceId,
        universityId,
        page = 0
    } = req.query;

    if (provinceId && !ObjectId.isValid(provinceId)) {
        // TODO: Render error
    }

    if (universityId && !ObjectId.isValid(universityId)) {
        // TODO: Render error
    }

    const resultsPerPage = config.api.search.resultsPerPage
    const limit = resultsPerPage;
    const skip = page ? resultsPerPage * page : 0;

    const count = yield countProgramsForFilter({
        province,
        university,
        name,
        provinceId,
        universityId,
        provincesCollection,
        universitiesCollection,
        programsCollection
    });

    if (count === 0) {
        // TODO: Render error
    }

    const programs = yield getProgramsWithFilter({
        province,
        university,
        name,
        provinceId,
        universityId,
        provincesCollection,
        universitiesCollection,
        programsCollection,
        limit,
        skip
    });

    res.locals.count = count;
    res.locals.programs = programs
            .map(transformProgramForOutput)
            .sort(sortByKey('name'));

    // Send info about the search to the front end for display purposes
    const [ firstProgram ] = res.locals.programs;
    res.locals.searchInfo = {};

    if (universityId) {
        res.locals.searchInfo.university = firstProgram.university.name;
    } else if (province) {
        res.locals.searchInfo.province = province;
    } else if (name) {
        res.locals.searchInfo.name = name;
    }

    return next();
});

export const setupSearchPagination = (req, res) => {
    const {
        page = 0
    } = req.query;

    const {
        count
    } = res.locals;

    const {
        resultsPerPage
    } = config.api.search;

    const lastPage = Math.floor(count / resultsPerPage);
    const rangeLow = page * resultsPerPage + 1;
    const rangeHigh = lastPage == page ? count : rangeLow + resultsPerPage - 1;

    res.locals.isFirstPage = page == 0;
    res.locals.isLastPage = page == lastPage;
    res.locals.currentPage = page;
    res.locals.rangeLow = rangeLow;
    res.locals.rangeHigh = rangeHigh > count ? count : rangeHigh;

    return res.render('search', res.locals);
}

export const home = (req, res) => {
    res.render('home');
};

export const contact = (req, res) => {
     res.render('contact');
};

export const programDetails = ({
    programsCollection = required('programsCollection')
}) => coroutine(function* (req, res) {
    const {
        programId
    } = req.params;

    if (programId && !ObjectId.isValid(programId)) {
        // TODO: Render error
    }

    const program = yield getProgramById({
        programsCollection,
        id: programId
    })

    if (!program) {
        // TODO: Render error
    }

    res.locals.program = transformProgramForOutput(program);

    res.render('programDetails');
});

export const processContact = ({
    contactCollection = required('contactCollection'),
    getMailMessage = required('getMailMessage'),
    sendMailMessage = required('sendMailMessage'),
    insertInDb = required('insertInDb')
}) => coroutine(function* (req, res, next) {
    const {
        name,
        email,
        message
    } = req.body;

    if (!name || !email || !message) {
        res.locals.formHandlingError = true;

        return next();
    }

    try {
        yield insertInDb({
            collection: contactCollection,
            document: {
                name,
                email,
                message
            }
        });
    } catch (e) {
        // TODO: Log error
        //logger.error(e, 'Error saving contact info to db');
        res.locals.formHandlingError = true;

        return next();
    }

    const mailMessage = getMailMessage({
        name,
        email,
        message
    });

    // Do not wait for the message to send because this takes a long time
    // Log an error if the email fails to send
    sendMailMessage({
        to: config.email.addresses.admin,
        message: mailMessage,
        subject: 'New Contact Submission'
    })
        .catch((e) => {
            // TODO: Log error with the information about the message
            // logger.error(e, 'Error sending mail message');
        })

    res.locals.request = {
        email
    };
    res.locals.requestSuccess = true;

    return next();
});

export const scholarshipApplication = (req, res) => {
    res.render('scholarshipApplication');
};

export const processScholarshipApplication = ({
    scholarshipApplicationCollection = required('scholarshipApplicationCollection'),
    getMailMessage = required('getMailMessage'),
    sendMailMessage = required('sendMailMessage'),
    insertInDb = required('insertInDb')
}) => coroutine(function* (req, res, next) {
    const {
        name,
        email,
        body: application
    } = req.body;

    if (!name || !email || !application) {
        res.locals.formHandlingError = true;

        return next();
    }

    try {
        yield insertInDb({
            collection: scholarshipApplicationCollection,
            document: {
                name,
                email,
                application
            }
        });
    } catch (e) {
        // TODO: Log error
        //logger.error(e, 'Error saving contact info to db');
        res.locals.formHandlingError = true;

        return next();
    }

    const mailMessage = getMailMessage({
        name,
        email,
        application
    });

    // Do not wait for the message to send because this takes a long time
    // Log an error if the email fails to send
    sendMailMessage({
        to: config.email.addresses.admin,
        message: mailMessage,
        subject: 'New Scholarship Application'
    })
        .catch((e) => {
            // TODO: Log error with the information about the message
            // logger.error(e, 'Error sending mail message');
        })

    res.locals.request = {
        email
    };
    res.locals.requestSuccess = true;

    return next();
});
