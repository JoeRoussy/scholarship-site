import { required, print, RuntimeError } from '../custom-utils';
import { ObjectId } from 'mongodb';

// NOTE: Functions in this module will return verbose data and the caller can clean it if they wish

async function getUniversitiesForProvince({
    province,
    provincesCollection,
    universityIds
}) {
    const programProvince = await provincesCollection.findOne({ name: province });

    if (programProvince) {
        // Now get all the universities for this province and add any new ids to the list
        const universitiesForProvince = await universitiesCollection.find({ provinceId: programProvince._id }).toArray();

        universitiesForProvince.forEach(u => {
            if (universityIds.indexOf(u._id) === -1) {
                universityIds.push(u._id);
            }
        });
    }

    return universityIds;
};

function getFilters(name, universityIds) {
    let filters = {};

    if (name) {
        filters = {
            $text: {
                $search: name
            }
        };
    }

    if (universityIds.length) {
        filters = {
            ...filters,
            universityId: {
                $in: universityIds
            }
        };
    }

    return filters;
}

// Gets all programs with optional filters. If no province or university matches the filters,
// they are ignored. Returns a promise.
// Throws RuntimeErrors
export const getProgramsWithFilter = async ({
    province,
    university,
    name,
    provincesCollection = required('provincesCollection'),
    universitiesCollection = required('universitiesCollection'),
    programsCollection = required('programsCollection')
}) => {
    let universityIds = [];

    // If a university was passed, try getting an id associated with it
    if (university) {
        try {
            const programUniversities = await universitiesCollection.find({
                $text: {
                    $search: university
                }
            }).toArray();

            if (programUniversities.length) {
                universityIds = programUniversities.map(x => x._id);
            }
        } catch (e) {
            throw new RuntimeError({
                msg: `Error getting universities for name: ${university}`,
                err: e
            });
        }
    }

    // If a province was passed, try getting an id associated with it as long as a university query should not override it
    if (province && !university) {
        try {
            universityIds = await getUniversitiesForProvince({
                province,
                provincesCollection,
                universityIds
            });
        } catch (e) {
            throw new RuntimeError({
                msg: `Error getting universities for province: ${province}`,
                err: e
            });
        }
    }

    // Get programs with the optional filters
    const filters = getFilters(name, universityIds);

    try {
        return await programsCollection.aggregate([
            {
                $match: filters
            },
            {
                $lookup: {
                    from: 'universities',
                    localField: 'universityId',
                    foreignField: '_id',
                    as: 'universities'
                }
            }
        ]).toArray();
    } catch (e) {
        throw new RuntimeError({
            msg: `Error getting programs for filters: ${JSON.stringify(filters, null, 4)}`,
            err: e
        });
    }
};


// Get a document by Id for a given collection. Returns a promise. Does not do any population
// Throws normal errors
export const getDocById = async ({
    collection = required('collection'),
    id = required('id')
}) => {
    if (typeof id === 'string') {
        id = ObjectId(id);
    }

    return await collection.findOne({ _id: id });
};


// Get a program by id and populate its university
export const getProgramById = async ({
    programsCollection = required('programsCollection'),
    id = required('id')
}) => {
    if (typeof id === 'string') {
        id = ObjectId(id);
    }

    const result = await programsCollection.aggregate([
        {
            $match: {
                _id: id
            }
        },
        {
            $lookup: {
                from: 'universities',
                localField: 'universityId',
                foreignField: '_id',
                as: 'universities'
            }
        }
    ]).toArray();

    const [ program ] = result;

    return program;
}

// Gets all universities with optional filters. Ignores invalid provinces in filter.
// Returns a promise
// Throws RuntimeErrors
export const getUniversitiesWithFilter = async({
    province,
    name,
    provincesCollection = required('provincesCollection'),
    universitiesCollection = required('universitiesCollection')
}) => {
    let universityIds = [];

    // If a provinces was passed, try and get an id associated with it
    if (province) {
        try {
            universityIds = await getUniversitiesForProvince({
                province,
                provincesCollection,
                universityIds
            });
        } catch (e) {
            throw new RuntimeError({
                msg: `Error getting universities for province: ${province}`,
                err: e
            });
        }
    }

    // Get universities with optional filters
    const filters = getFilters(name, universityIds);

    try {
        return await universitiesCollection.aggregate([
            {
                $match: filters
            },
            {
                $lookup: {
                    from: 'provinces',
                    localField: 'provinceId',
                    foreignField: '_id',
                    as: 'provinces'
                }
            }
        ]).toArray();
    } catch (e) {
        throw new RuntimeError({
            msg: `Error getting programs for filters: ${JSON.stringify(filters, null, 4)}`,
            err: e
        });
    }
};
