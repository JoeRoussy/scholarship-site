/*
    All loggers in this module should a module key in the form: api-function-name
*/

import { required, print } from '../components/custom-utils';
import { getProgramsWithFilter, getDocById, getProgramById as dataModuleGetProgramById, getUniversitiesWithFilter } from '../components/data';

function transformProgramForOutput(program) {
    // Clean the extra props out of each program
    const {
        universities: [
            {
                name: universityName,
                _id: uId
            }
        ],
        universityId,
        ...programProps
    } = program;

    return {
        university: {
            _id: uId,
            name: universityName
        },
        ...programProps
    };
}

function transformUniversityForOutput(university) {
    const {
        provinces: [
            {
                _id: pId,
                name: pName
            }
        ],
        provinceId,
        language,
        ...universityProps
    } = university;

    return {
        ...universityProps,
        province: {
            _id: pId,
            name: pName
        }
    };
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
        name
    } = req.query;

    getProgramsWithFilter({
        province,
        university,
        name,
        provincesCollection,
        universitiesCollection,
        programsCollection
    })
        .then(programs => res.json({
            count: programs.length,
            programs: programs.map(transformProgramForOutput)
        }))
        .catch(e => {
            logger.error(e.err, e.msg);

            return res.json({
                err: true,
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

    dataModuleGetProgramById({
        programsCollection,
        id
    })
        .then(program => res.json({
            program: transformProgramForOutput(program)
        }))
        .catch(e => {
            logger.error(e, `Error getting program with id: ${id}`);

            res.json({
                err: true,
                message: `Could not get a program with id ${id}`
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
        .then(universities => res.json({
            count: universities.length,
            universities: universities.map(transformUniversityForOutput)
        }))
        .catch(e => {
            logger.error(e.err, e.msg);

            return res.json({
                err: true,
                message: 'Error getting universities'
            });
        })
}

export const getUniversityById = ({
    universitiesCollection = required('universitiesCollection', 'You must pass in the universities db collection'),
    logger = required('logger', 'you must pass a logger for this function to use')
}) => (req, res) => {
    const {
        id
    } = req.params;

    getDocById({
        collection: universitiesCollection,
        id
    })
        .then(university => {
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

            res.json({
                err: true,
                message: `Could not get a university with id ${id}`
            });
        })
}
