import {
    required,
    print,
    RuntimeError,
    intersectIfPopulated,
    convertToObjectId
} from '../custom-utils';

// NOTE: Functions in this module will return verbose data and the caller can clean it if they wish

// Finds the ids of any universities for a province. Returns an empty array if no province can be found
async function getUniversitiesForProvince({
    province,
    provincesCollection,
    universitiesCollection
}) {
    // TODO: This should be a text search (if we even use this endpoint)
    const provinceDocument = await provincesCollection.findOne({ name: province });

    if (provinceDocument) {
        // Now get all the universities for this province and add any new ids to the list
        const universitiesForProvince = await universitiesCollection.find({ provinceId: provinceDocument._id }).toArray();

        return universitiesForProvince.map(x => x._id);
    } else {
        // We could not find a province
        return [];
    }
};

const objectIdIntersectComparator = (element, array) => array.some(x => x.equals(element));

// Takes the ID for a province and returns the an array of university IDs for it. Returns an empty array
// if the province cannot be found
// TODO: Might want to merge this with the function above that does almost the same thing (with the rule that you cannot pass an id and name)
async function getUniversitiesForProvinceId({
    provinceId,
    provincesCollection,
    universitiesCollection
}) {
    const province = await provincesCollection.findOne({ _id: provinceId });

    if (province) {
        // Now get all the universities for this province and add any new ids to the list
        const universitiesForProvince = await universitiesCollection.find({ provinceId: province._id }).toArray();

        return universitiesForProvince.map(x => x._id);
    } else {
        // We could not find a province
        return [];
    }
}

// Makes a db query based on an optional name search and an optional list of
// universityIds
function getFilters(name, universityIds, isForUniversitiesCollection) {
    let filters = {};

    if (name) {
        let regex = '';
        const words = name.split(' ');

        if (words.length === 1) {
            // If there is only 1 word in the name query, use that
            regex = words[0];
        } else {
            // If there are multiple words in the name query, use and logic in the regex
            regex = words.reduce((r, word) => `${r}(?=.*${word})`, '');
        }

        filters.name = {
            $regex: regex,
            $options: 'i'
        };
    }

    if (universityIds.length) {
        filters = {
            ...filters,
            [isForUniversitiesCollection ? '_id' : 'universityId']: {
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
    provinceId,
    universityId,
    provincesCollection = required('provincesCollection'),
    universitiesCollection = required('universitiesCollection'),
    programsCollection = required('programsCollection')
}) => {
    let universityIds = [];

    if (provinceId) {
        provinceId = convertToObjectId(provinceId);
    }

    if (universityId) {
        universityId = convertToObjectId(universityId);
    }

    if (university) {
        // If a university was passed, try getting an id associated with it
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
    } else if (universityId) {
        // We got a university ID directly, we should use this
        universityIds = [ universityId ];
    }

    if (province) {
        // If a province was passed, try getting an id associated with it
        try {
            const universityIdsForProvince = await getUniversitiesForProvince({
                province,
                provincesCollection,
                universitiesCollection
            });

            universityIds = intersectIfPopulated(universityIds, universityIdsForProvince, objectIdIntersectComparator);
        } catch (e) {
            throw new RuntimeError({
                msg: `Error getting universities for province: ${province}`,
                err: e
            });
        }
    } else if (provinceId) {
        // We are told to use a province directly so let's get the universities for this province
        const universityIdsForProvince = await getUniversitiesForProvinceId({
            provinceId,
            provincesCollection,
            universitiesCollection
        });

        universityIds = intersectIfPopulated(universityIds, universityIdsForProvince, objectIdIntersectComparator);
    }

    if ((province || university) && !universityIds.length) {
        // We got some filters for province and university but we did not find any, so there are not programs for these params
        return [];
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


// Get a document by Id for a given collection. Returns a promise. Does not do any population.
// Throws normal errors
export const getDocById = async ({
    collection = required('collection'),
    id = required('id')
}) => {
    return await collection.findOne({ _id: convertToObjectId(id) });
};


// Gets a program by id and populates its university.
// Returns a promise
// Throws RuntimeErrors
export const getProgramById = async ({
    programsCollection = required('programsCollection'),
    id = required('id')
}) => {
    id = convertToObjectId(id);

    let result;

    try {
        result = await programsCollection.aggregate([
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
    } catch (e) {
        throw new RuntimeError({
            msg: `Could not get program with id: ${id}`,
            err: e
        });
    }

    const [ program ] = result;

    return program;
}

// Gets all universities with optional filters.
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
                universitiesCollection,
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
    const filters = getFilters(name, universityIds, true);

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
