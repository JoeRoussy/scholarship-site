/*
    All loggers in this module should a module key in the form: api-function-name
*/
import fs from 'fs';

import { required, print, unique, getRegex, convertToObjectId } from '../components/custom-utils';
import {
    getProgramsWithFilter,
    getDocById,
    getProgramById as dataModuleGetProgramById,
    getUniversitiesWithFilter,
    getUsers,
    getScholarshipApplicationsWithFilter,
    getWinnerForPromo,
    deleteUser,
    getPersonalData as getPersonalDataForUser,
    getSingleFavoriteProgram
} from '../components/data';
import {
    transformProgramForOutput,
    transformUniversityForOutput,
    transformUserForOutput,
    transformScholarshipApplicationForOutput
 } from '../components/transformers';
import { ObjectId } from 'mongodb';
import { wrap as coroutine } from 'co';
import { findAndUpdate, insert, deleteOne } from '../components/db/service';
import config from '../config';

const {
    files: {
        userDataRelativePath: USER_DATA_FILES_RELATIVE_PATH,
        userDataFileName: USER_DATA_FILE_NAME
    } = {}
} = config;

if (!USER_DATA_FILES_RELATIVE_PATH || !USER_DATA_FILE_NAME) {
    throw new Error('Missing config element: files.userDataRelativePath');
}


export const programSearch = ({
    provincesCollection = required('provincesCollection', 'You must pass in the provinces db collection'),
    universitiesCollection = required('universitiesCollection', 'You must pass in the universities db collection'),
    programsCollection = required('programsCollection', 'You must pass in the programs db collection'),
    logger = required('logger', 'You must pass a logger for this function to use')
}) => (req, res) => {
    const {
        province,
        university,
        name,
        provinceId,
        universityId
    } = req.query;

    if (provinceId && !ObjectId.isValid(provinceId)) {
        return res.status(400).json({
            error: true,
            message: `${provinceId} is not a valid province id`
        });
    }

    if (universityId && !ObjectId.isValid(universityId)) {
        return res.status(400).json({
            error: true,
            message: `${universityId} is not a valid university id`
        });
    }

    getProgramsWithFilter({
        province,
        university,
        name,
        provinceId,
        universityId,
        provincesCollection,
        universitiesCollection,
        programsCollection
    })
        .then(programs => {
            const count = programs.length;

            if (count === 0) {
                if (!province && !university && !name && !provinceId && !universityId) {
                    // Could not find programs without filter, something must be wrong...
                    logger.error(null, 'Could not find any programs in the db');

                    return res.status(500).json({
                        error: true,
                        message: 'Could not find any programs'
                    });
                }

                // Otherwise we just could not find programs for that filter
                logger.info({
                    province,
                    university,
                    name,
                    provinceId,
                    universityId
                }, 'No programs found for filter');
            }

            return res.json({
                count,
                programs: programs.map(transformProgramForOutput)
            });
        })
        .catch(e => {
            logger.error(e.err, e.msg);

            return res.status(500).json({
                error: true,
                message: 'Error getting programs'
            });
        });
};

export const getProgramById = ({
    programsCollection = required('programsCollection', 'You must pass in the programs db collection'),
    logger = required('logger', 'You must pass a logger for this function to use')
}) => (req, res) => {
    const {
        id
    } = req.params;

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({
            error: true,
            message: `${id} is not a valid id`
        });
    }

    dataModuleGetProgramById({
        programsCollection,
        id
    })
        .then(program => {
            if (!program) {
                logger.warn({
                    id
                }, 'Could not find a program with by id with valid format');

                return res.status(404).json({
                    error: true,
                    message: `Could not find program with id ${id}`
                });
            }

            return res.json({
                program: transformProgramForOutput(program)
            });
        })
        .catch(e => {
            logger.error(e, `Error getting program with id: ${id}`);

            return res.status(500).json({
                error: true,
                message: `Error getting a program with id ${id}`
            });
        });
};

export const universitiesSearch = ({
    provincesCollection = required('provincesCollection', 'You must pass in the provinces db collection'),
    universitiesCollection = required('universitiesCollection', 'You must pass in the universities db collection'),
    logger = required('logger', 'You must pass in a logger for this function to use')
}) => (req, res) => {
    const {
        province,
        name
    } = req.query;

    getUniversitiesWithFilter({
        province,
        name,
        provincesCollection,
        universitiesCollection
    })
        .then(universities => {
            const count = universities.length;

            if (count === 0) {
                if (!province && !name) {
                    // Could not find any universities without a filter, something must be wrong
                    logger.error(null, 'Could not find any universities in the db');

                    return res.status(500).json({
                        error: true,
                        message: `Could not find any universities`
                    });
                }

                // Otherwise there are just no universities for this filter
                logger.info({
                    province,
                    name
                }, 'No province found for filter');
            }

            return res.json({
                count: universities.length,
                universities: universities.map(transformUniversityForOutput)
            });
        })
        .catch(e => {
            logger.error(e.err, e.msg);

            return res.status(500).json({
                error: true,
                message: 'Error getting universities'
            });
        });
}

export const getUniversityById = ({
    universitiesCollection = required('universitiesCollection', 'You must pass in the universities db collection'),
    logger = required('logger', 'you must pass a logger for this function to use')
}) => (req, res) => {
    const {
        id
    } = req.params;

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({
            error: true,
            message: `${id} is not a valid id`
        });
    }

    getDocById({
        collection: universitiesCollection,
        id
    })
        .then(university => {
            if (!university) {
                logger.warn({
                    id
                }, 'Could not find a university by id with valid format');

                return res.status(404).json({
                    error: true,
                    message: `Could not find university with id ${id}`
                });
            }

            const {
                provinceId,
                language,
                ...props
            } = university;

            return res.json({
                university: props
            });
        })
        .catch(e => {
            logger.error(e, `Error getting university with id: ${id}`);

            return res.status(500).json({
                error: true,
                message: `Could not get a university with id ${id}`
            });
        });
}

export const usersSearch = ({
    usersCollection = required('usersCollection', 'You must pass in the users db collection'),
    scholarshipApplicationsCollection = required('scholarshipApplicationsCollection', 'You must pass in the scholarship applications db collection'),
    logger = required('logger', 'you must pass a logger for this function to use')
}) => (req, res) => {
    const {
        hasScholarshipApplication,
        name
    } = req.query;

    if (hasScholarshipApplication) {
        // We are finding all the scholarship applications and only returning the users
        getScholarshipApplicationsWithFilter({
            scholarshipApplicationsCollection
        })
            .then(applications => {
                const transformedApplications = applications.map(transformScholarshipApplicationForOutput);
                const users = transformedApplications.map(x => x.user);
                let filteredUsers = users;

                // Filter out the users if we got a name in the search
                // TODO: If we get a lot of users this is going to be slow
                if (name) {
                    const regex = new RegExp(getRegex(name), 'i');

                    filteredUsers = users.filter(user => regex.test(user.name));
                }

                const transformedUsers = filteredUsers.map(transformUserForOutput);
                const uniqueTransformedUsers = unique(transformedUsers);

                return res.json({
                    count: uniqueTransformedUsers.count,
                    users: uniqueTransformedUsers
                });
            })
            .catch(e => {
                logger.error(e, 'Error getting users');

                return res.status(500).json({
                    error: true,
                    message: 'Could not get users'
                });
            });
    } else {
        // We are finding all the users
        getUsers({
            usersCollection
        })
            .then(users => {
                const count = users.count;

                if (count === 0) {
                    // There must be something wrong if we cannot find any users
                    // NOTE: We have not implemented any filter up until now

                    logger.warn('Could not find any users');
                }

                return res.json({
                    count,
                    users: users.map(transformUserForOutput)
                });
            })
            .catch(e => {
                logger.error(e, 'Error getting users');

                return res.status(500).json({
                    error: true,
                    message: 'Could not get users'
                });
            });
    }
}

export const promoWinnerGeneration = ({
    referralPromosCollection = required('referralPromosCollection'),
    referralsCollection = required('referralsCollection'),
    logger = required('logger', 'you must pass a logger for this function to use')
}) => coroutine(function*(req, res) {
    const {
        promoId
    } = req.params;

    if (!promoId) {
        return res.status(400).json({
            error: true,
            message: 'You must pass a promo id to this endpoint: /api/{promoId}/winner'
        });
    }

    let winner;

    // Get the winner
    try {
        winner = yield getWinnerForPromo({
            promoId,
            referralsCollection,
            referralPromosCollection
        });
    } catch (e) {
        logger.error(e.err, e.msg);

        return res.status(500).json({
            error: true,
            message: 'A winner could not be chosen for this promotion'
        });
    }

    if (!winner) {
        logger.warn({ promoId }, 'No winner returned for this promotion');

        return res.status(500).json({
            error: true,
            message: 'A winner could not be found for this promotion'
        });
    }

    // Update the promo with this new winner
    try {
        yield findAndUpdate({
            collection: referralPromosCollection,
            query: {
                _id: convertToObjectId(promoId)
            },
            update: {
                winnerId: convertToObjectId(winner._id)
            }
        });
    } catch (e) {
        logger.error(e, `Could not update promo with id: ${promoId} with winner with id: ${winner._id}`);

        return res.status(500).json({
            error: true,
            message: 'The winner could not be assigned to this promotion'
        });
    }

    return res.json({
        user: winner
    });
});

export const deleteProfile = ({
    usersCollection = required('usersCollection'),
    referralsCollection = required('referralsCollection'),
    logger = required('logger', 'you must pass a logger for this function to use')
}) => coroutine(function* (req, res) {
    const {
        user
    } = req;

    if (!user) {
        return res.status(403).json({
            error: true,
            message: 'No user logged in.'
        });
    }

    try {
        yield deleteUser({
            usersCollection,
            referralsCollection,
            userId: convertToObjectId(user._id)
        });
    } catch (e) {
        logger.error(e, `Could not delete user with id: ${user._id}`);

        return res.status(500).json({
            error: true,
            message: 'A winner could not be found for this promotion'
        });
    }

    req.logout();

    return res.status(200).json({
        message: 'User deleted'
    });
});

export const getPersonalData = ({
    usersCollection = required('usersCollection'),
    logger = required('logger', 'you must pass a logger for this function to use')
}) => coroutine(function* (req, res, next) {
    const {
        user
    } = req;

    if (!user) {
        return res.status(403).json({
            error: true,
            message: 'No user logged in.'
        });
    }

    // Get an object containing all the user data
    let userData = null;

    try {
        userData = yield getPersonalDataForUser({
            usersCollection,
            userId: user._id
        });
    } catch (e) {
        logger.error(e, `Error getting personal data for user with id: ${user._id}`)
        
        return next(e);
    }

    // Write the file on disk
    const filePath = `${process.cwd()}${USER_DATA_FILES_RELATIVE_PATH}${user._id}.json`;
    const fileContents = JSON.stringify(userData, null, 4);

    fs.writeFile(filePath, fileContents, (err) => {
        if (err) {
            logger.error(e, `Error writting data for user with id: ${user._id}`)
        
            return next(e);
        }

        // Send the file as a response
        return res.sendFile(filePath, {
            headers: {
                'Content-Disposition': `attachment; filename="${USER_DATA_FILE_NAME}"`
            }
        }, (err) => {
            if (err) {
                logger.error(e, `Error sending user data for user with id: ${user._id}`)
            
                return next(e);
            }
        });
    });
});

export const addFavoriteProgram = ({
    favoriteProgramsCollection = required('favoriteProgramsCollection'),
    logger = required('logger', 'you must pass a logger for this function to use')
}) => coroutine(function* (req, res) {
    // Make sure there is a user signed in
    const {
        user
    } = req;

    if (!user) {
        return res.status(403).json({
            error: true,
            message: 'No user logged in.'
        });
    }

    // Make sure we got a program id to associate as the favorite
    let {
        programId
    } = req.body;

    if (!programId) {
        return res.status(400).json({
            error: true,
            message: 'You need to pass a programId to favorite.'
        });
    }

    // Make sure there this program is not already favorited
    const userId = user._id;
    programId = convertToObjectId(programId);

    let currentFavorite = null;

    try {
        currentFavorite = yield getSingleFavoriteProgram({
            favoriteProgramsCollection,
            userId,
            programId
        });
    } catch (e) {
        logger.error(e, `Error getting potential duplicate favorite. User id: ${userId}, program id: ${programId}`);

        return res.status(500).json({
            error: true,
            message: 'Internal error.'
        });
    }

    if (currentFavorite) {
        return res.status(400).json({
            error: true,
            message: 'You have already favorited this program.'
        });
    }

    // Now that we know this is not a dupe, insert the new favorite.
    let favoriteDocument = null;

    try {
        favoriteDocument = yield insert({
            collection: favoriteProgramsCollection,
            document: {
                userId,
                programId
            },
            returnInsertedDocument: true
        });
    } catch (e) {
        logger.error(e, `Error saving new favorite. User id: ${userId}, program id: ${programId}`);

        return res.status(500).json({
            error: true,
            message: 'Internal error.'
        });
    }

    return res.json({
        message: 'Favorite added',
        favoriteProgram: favoriteDocument
    });
});

export const removeFavoriteProgram = ({
    favoriteProgramsCollection = required('favoriteProgramsCollection'),
    logger = required('logger', 'you must pass a logger for this function to use')
}) => coroutine(function* (req, res, next) {
    const {
        user
    } = req;

    if (!user) {
        return res.status(403).json({
            error: true,
            message: 'No user logged in.'
        });
    }

    let {
        id: programId
    } = req.params;

    if (!programId) {
        return res.status(400).json({
            error: true,
            message: 'Missing programId request parameter'
        });
    }

    let deletedDocument = null;
    const userId = user._id;
    programId = convertToObjectId(programId);

    try {
        deletedDocument = yield deleteOne({
            collection: favoriteProgramsCollection,
            query: {
                userId,
                programId
            }
        });
    } catch (e) {
        logger.error(e, `Error deleting favorite. User id: ${userId}, program id: ${programId}`);

        return res.status(500).json({
            error: true,
            message: 'Could not delete favorite program'
        });
    }


    return res.json({
        message: 'Deleted favorite program',
        favoriteProgram: deletedDocument
    });
});

export const setCasl = ({
    usersCollection = required('usersCollection'),
    value = required('value'),
    logger = required('logger', 'You need to pass a logger for this function to use')
}) => coroutine(function* (req, res) {
    const {
        user
    } = req;

    if (!user) {
        return res.status(403).json({
            error: true,
            message: 'No user logged in.'
        });
    }

    try {
        yield findAndUpdate({
            collection: usersCollection,
            query: {
                _id: convertToObjectId(user._id)
            },
            update: {
                caslConfirmation: value
            }
        });
    } catch (e) {
        logger.error(e, `Error setting caslConfirmation to ${value} for user with id: ${user._id}`);

        return res.status(500).json({
            error: true,
            message: 'Could not set caslConfirmation'
        });
    }

    return res.json({
        success: true,
        message: `Casl consent set to: ${value}`
    });
});
