import { wrap as coroutine } from 'co';
import { ObjectId } from 'mongodb';

import {
    getProgramsWithFilter,
    getProgramById,
    countProgramsForFilter,
    getCurrentReferralInformation,
    populateMembershipInformation,
    updateUser,
    editPassword as editUserPassword,
    getSingleFavoriteProgram,
    getFavoriteProgramsForUser
} from '../components/data';
import { getById } from '../components/db/service';
import { transformProgramForOutput, transformPromoForOutput } from '../components/transformers';
import { print, sortByKey, required, redirectToError, isMember, convertToObjectId } from '../components/custom-utils';
import config from '../config';
import eol from 'eol';

if (!config) {
    throw new Error('Could not load config');
}

const {
    errors: {
        generic: GENERAL_ERROR = required('general', 'Need to add this in the config')
    }
} = config;

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
    } = req.query;

    let {
        page = 0
    } = req.query;

    if (provinceId && !ObjectId.isValid(provinceId)) {
        // TODO: Render error
    }

    if (universityId && !ObjectId.isValid(universityId)) {
        // TODO: Render error
    }

    // If the user is not a member, they can only see the first page
    if (!isMember(req)) {
        page = 0;
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
    res.locals.searchPage = page;
    res.locals.programs = programs
            .map(transformProgramForOutput)
            .sort(sortByKey('name'));

    // Send info about the search to the front end for display purposes
    res.locals.searchInfo = {};

    if (universityId) {
        let university;

        try {
            university = yield getById({
                collection: universitiesCollection,
                id: convertToObjectId(universityId)
            });
        } catch (e) {
            // TODO: Render error
            console.error(e)
        }

        if (university) {
            res.locals.searchInfo.university = university.name;
        }

    }

    if (province) {
        res.locals.searchInfo.province = province;
    }

    if (name) {
        res.locals.searchInfo.name = name;
    }

    return next();
});

export const markFavorites = ({
    favoriteProgramsCollection = required('favoriteProgramsCollection'),
    logger = required('logger', 'You must pass a logging instance for this function to use')
}) => coroutine(function* (req, res, next){
    const {
        user
    } = req;

    if (!user) {
        // No need to continue
        return next();
    }

    let favorites = null;

    try {
        favorites = yield getFavoriteProgramsForUser({
            favoriteProgramsCollection,
            userId: user._id
        });
    } catch (e) {
        // We cannot recover from this and this is not perfoming a critical action so we'll continue to the
        // next function but write an error to document what went wrong
        logger.error(e, 'Error finding favorite programs for user');

        return next();
    }

    if (!favorites.length) {
        // No need to continue
        return next();
    }

    // Use strings so functions don't break on check equality of ids without using the custom function
    const favoriteIds = favorites.map(favorite => favorite.programId.toString());

    res.locals.programs = res.locals.programs.map(program => {
        const isFavorite = favoriteIds.includes(program._id.toString())

        return {
            ...program,
            isFavorite
        };
    });

    return next();
});

export const setupSearchPagination = (req, res) => {
    const {
        count = 0,
        searchPage: page = 0
    } = res.locals;

    const {
        resultsPerPage
    } = config.api.search;

    if (!(count && page)) {
        // TODO: Something has gone wrong
    }

    let lastPage = Math.floor(count / resultsPerPage);

    if (count % resultsPerPage == 0) {
        // If this is the case, all the results will fit on the page before the last page we just computed
        --lastPage;
    }

    const rangeLow = page * resultsPerPage + 1;
    const rangeHigh = lastPage == page ? count : rangeLow + resultsPerPage - 1;

    res.locals.isFirstPage = page == 0;
    res.locals.isLastPage = page == lastPage;
    res.locals.currentPage = page;
    res.locals.rangeLow = rangeLow;
    res.locals.rangeHigh = rangeHigh > count ? count : rangeHigh;

    // TODO: Given the name of this function, the rendering should be a separate function
    return res.render('search', res.locals);
}

export const home = (req, res) => {
    // Need to get some random hero image
    let imageIndex = Math.floor(Math.random() * config.content.heroImageCount);

    // Unless we got 0 out of the RNG, map imageIndex to a 0-index number
    if (imageIndex) {
        --imageIndex;
    }

    res.locals.page.backgroundImage = res.locals.page.backgroundImages[imageIndex];

    res.render('home', res.locals);
};

// This route handler will render an error page with a 200 response. It can be redirected to if needed.
export const error = (req, res) => {
    // Render the error page with a paragraph based on the key passed in
    const {
        errorKey = 'default'
    } = req.query;

    // Make sure the error key matches with the content of the page
    let isValidErrorKey = true;
    let contentObjects = [ res.locals.page.subheadings, res.locals.page.descriptions ];

    for (let obj of contentObjects) {
        if (!Object.keys(obj).some(x => x === errorKey)) {
            isValidErrorKey = false;
            break;
        }
    }

    if (isValidErrorKey) {
        res.locals.errorKey = errorKey;
    } else {
        res.locals.errorKey = 'default';
    }

    return res.render('error', res.locals);
};

export const studyingInCanada = (req, res) => {
    if (!req.user) {
        return res.redirect('/');
    }

    res.render('news.hbs', res.locals);
}

export const contact = (req, res) => {
     res.render('contact');
};

export const programDetails = ({
    programsCollection = required('programsCollection'),
    favoriteProgramsCollection = required('favoriteProgramsCollection'),
    logger = required('logger', 'You must pass a logging instance for this function to use')
}) => coroutine(function* (req, res, next) {
    const {
        programId
    } = req.params;

    if (programId && !ObjectId.isValid(programId)) {
        return next('Invalid program id');
    }

    let program;

    try {
        program = yield getProgramById({
            programsCollection,
            id: convertToObjectId(programId)
        });
    } catch (e) {
        logger.error(e, `Erorr getting program by id. Program id: ${programId}`);

        return next(e);
    }

    if (!program) {
        logger.warn({ programId }, 'Could not find program with well-formed id');

        return next('Could not find program');
    }

    if (!req.user) {
        // This program cannot be a favorite
        res.locals.isFavorite = false;
    } else {
        // We need to see if this is a favorite
        try {
            const possibleFavorite = yield getSingleFavoriteProgram({
                favoriteProgramsCollection,
                userId: req.user._id,
                programId: convertToObjectId(programId)
            });

            res.locals.isFavorite = !!possibleFavorite;
        } catch (e) {
            logger.error(e, `Could not find out if this is a favorite program. Program id: ${programId}`);

            return next(e);
        }
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
        });

    res.locals.request = {
        email
    };
    res.locals.requestSuccess = true;

    return next();
});

export const scholarshipApplication = (scholarshipApplicationCollection) => coroutine(function* (req, res) {
    // If we get this collection we will check for duplicates
    if (scholarshipApplicationCollection) {
        // See if there is a logged in user that has submitted an application
        const {
            user: {
                _id: userId
            } = {}
        } = req;

        if (userId) {
            // We should check for a duplicate id
            try {
                const previousApplication = yield scholarshipApplicationCollection.findOne({ userId });

                res.locals.duplicateApplication = !!previousApplication;
            } catch (e) {
                // TODO: Log error
                //logger.error(e, 'Error saving contact info to db');

                return redirectToError('default', res);
            }
        }
    }

    res.render('scholarshipApplication');
});

export const processScholarshipApplication = ({
    scholarshipApplicationCollection = required('scholarshipApplicationCollection'),
    getSystemMailMessage = required('getSystemMailMessage'),
    getUserMailMessage = required('getUserMailMessage'),
    sendMailMessage = required('sendMailMessage'),
    insertInDb = required('insertInDb')
}) => coroutine(function* (req, res, next) {
    const {
        name,
        email,
        body: application
    } = req.body;

    if (!isMember(req)) {
        return redirectToError('nonMemberScholarshipApplication', res);
    }

    if (!name || !email || !application) {
        res.locals.formHandlingError = true;

        return next();
    }

    const {
        _id: userId
    } = req.user;

    if (!userId) {
        // TODO: Log an error for us being in a weird state

        res.locals.formHandlingError = true;

        return next();
    }

    // Make sure this user has not already submitted an application
    try {
        const previousApplication = yield scholarshipApplicationCollection.findOne({ userId });

        if (previousApplication) {
            // We don't need a nice error because the UI does not let people submit duplicate application
            res.locals.formHandlingError = true;

            return next();
        }
    } catch (e) {
        res.locals.formHandlingError = true;

        return next();
    }

    // Save the application with any line endings normalized to '\n'
    const normalizedApplication = eol.lf(application);

    try {
        yield insertInDb({
            collection: scholarshipApplicationCollection,
            document: {
                name,
                email,
                application: normalizedApplication,
                userId
            }
        });
    } catch (e) {
        // TODO: Log error
        //logger.error(e, 'Error saving contact info to db');
        res.locals.formHandlingError = true;

        return next();
    }

    const systemMailMessage = getSystemMailMessage({
        name,
        email,
        application: normalizedApplication
    });

    const confirmationMailMessage = getUserMailMessage({
        name,
        application: normalizedApplication
    });

    // Do not wait for the messages to send because this takes a long time
    // Log an error if the emails fail to send

    // Email to system to so we can read application
    sendMailMessage({
        to: config.email.addresses.admin,
        message: systemMailMessage,
        subject: 'New Scholarship Application'
    })
        .catch((e) => {
            // TODO: Log error with the information about the message
            // logger.error(e, 'Error sending mail message');
        });

    // Confirmation to user that we have got the application
    sendMailMessage({
        to: email,
        message: confirmationMailMessage,
        subject: 'We Have Received Your Scholarship Application!'
    })
        .catch((e) => {
            // TODO: Log error with the information about the message
            // logger.error(e, 'Error sending mail message');
        });

    res.locals.request = {
        email
    };
    res.locals.requestSuccess = true;

    return next();
});

export const profile = ({
    referralsCollection = required('referralsCollection'),
    referralPromosCollection = required('referralPromosCollection'),
    transactionsCollection = required('transactionsCollection'),
    favoriteProgramsCollection = required('favoriteProgramsCollection'),
    logger = required('logger', 'You must pass in a logging instance for this function to use')
}) => coroutine(function* (req, res) {
    // Make sure there is a current user in req.user
    let {
        user
    } = req;

    if (!user) {
        return res.redirect('/');
    }

    // Get referal information for the current user
    let currentPromos = [];

    try {
        currentPromos = yield getCurrentReferralInformation({
            userId: user._id,
            referralsCollection,
            referralPromosCollection
        });
    } catch (e) {
        logger.error(e, 'Could not find the referral information about the current promotions');

        return redirectToError('default', res);
    }

    // Populate member information for the current user
    try {
        user = yield populateMembershipInformation({
            user,
            transactionsCollection
        });
    }  catch (e) {
        logger.error(e, 'Could not populate user with membership information');

        return redirectToError('default', res);
    }

    // Get list of favorite programs
    let favoritePrograms = [];

    try {
        favoritePrograms = yield getFavoriteProgramsForUser({
            favoriteProgramsCollection,
            userId: user._id
        });
    } catch (e) {
        logger.error(e, 'Error finding favorite programs');

        return redirectToError('default', res);
    }

    // Need to assign the new user to locals along with the currentPromos
    res.locals.user = user;
    res.locals.currentPromos = currentPromos.map(transformPromoForOutput);
    res.locals.favoritePrograms = favoritePrograms
            .map(fp => fp.program)
            .map(transformProgramForOutput);

    return res.render('profile/index');
});

export const editProfile = (req, res) => {
    const {
        user
    } = req;

    if (!user) {
        return res.redirect('/');
    }

    res.locals.user = user;

    return res.render('profile/edit');
};

export const processEditProfile = ({
    usersCollection = required('usersCollection'),
    logger = required('logger', 'You must pass a logging instance for this function to use')
}) => coroutine(function* (req, res, next) {
    const {
        user
    } = req;

    if (!user) {
        return res.redirect('/');
    }

    const {
        name,
        email
    } = req.body;

    // Update the current user that is logged in
    let newUser = null;

    try {
        newUser = yield updateUser({
            usersCollection,
            name,
            email,
            userId: user._id
        });
    } catch (e) {
        logger.error(e, 'Error updating user');
        res.locals.formHandlingError = true;

        return next();
    }

    // Log the user in so the values are correct
    req.login(newUser, (err) => {
        if (err) {
            logger.error(err, 'Error logging in user after updating values');
            res.locals.formHandlingError = true;

            return next();
        }

        return res.redirect('/?profileUpdated=true');
    });
});

export const editPassword = (req, res) => {
    const {
        user
    } = req;

    if (!user) {
        return res.redirect('/');
    }

    return res.render('profile/editPassword');
};

export const processEditPassword = ({
    usersCollection = required('usersCollection'),
    logger = required('logger', 'You must pass a logging instance for this function to use')
}) => coroutine(function* (req, res, next) {
    const {
        user
    } = req;

    if (!user) {
        return res.redirect('/');
    }

    const {
        newPassword
    } = req.body;

    if (!newPassword) {
        logger.warn('Tried to process edit password with no new password');
        res.locals.formHandlingError = true;

        return next();
    }

    try {
        yield editUserPassword({
            usersCollection,
            userId: user._id,
            newPassword
        });
    } catch (e) {
        logger.error(e, `Could not change password for user with id: ${user._id}`);
        res.locals.formHandlingError = true;

        return next();
    }

    // Log the user out sop they need to log in with the new password (makes old logins on other devices no longer valid)
    req.logout();

    return res.redirect('/?passwordEditSucces=true');
});

export const privacyPolicy = (req, res) => res.render('privacy');

// This serves pages with a 500 response. It is meant for server errors to be returned to the client.
// It is invoked by calling next(e)
export const errorHandler = function(err, req, res, next) {
    res.status(500);
    res.locals.errorKey = err.key || GENERAL_ERROR;

    // Throw an error in the logs just in case this was not picked up before
    console.log('From error handler middleware:');
    console.error(err);

    return res.render('serverError', res.locals);
};
