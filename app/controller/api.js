/*
    All loggers in this module should a module key in the form: api-function-name
*/

import { required, print } from '../components/custom-utils';
import { getProgramsWithFilter } from '../components/data';

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

    const programs = getProgramsWithFilter({
        province,
        university,
        name,
        provincesCollection,
        universitiesCollection,
        programsCollection
    })
        .then(programs => res.json({
            count: programs.length,
            programs
        }))
        .catch(e => {
            logger.error(e.err, e.msg);

            return res.json({
                err: true,
                message: 'Error getting programs'
            });
        });
}
