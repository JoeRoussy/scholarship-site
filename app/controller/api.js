/*
    All loggers in this module should a module key in the form: api-function-name
*/

import { required, print, unique, getRegex } from '../components/custom-utils';
import {
    getProgramsWithFilter,
    getDocById,
    getProgramById as dataModuleGetProgramById,
    getUniversitiesWithFilter,
    getUsers,
    getScholarshipApplicationsWithFilter
} from '../components/data';
import {
    transformProgramForOutput,
    transformUniversityForOutput,
    transformUserForOutput,
    transformScholarshipApplicationForOutput
 } from '../components/transformers';
import { ObjectId } from 'mongodb';


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
                const count = uniqueTransformedUsers.count;

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
