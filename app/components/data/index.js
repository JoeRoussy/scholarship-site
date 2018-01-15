import moment from 'moment';
import { insert } from '../db/service';
import {
    required,
    print,
    RuntimeError,
    intersectIfPopulated,
    convertToObjectId,
    getRegex
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
        filters.name = {
            $regex: getRegex(name),
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

// Takes some options and builds up an array of university ids associated with those options
const getUniversityIdsForOptions = async ({
    province,
    university,
    provinceId,
    universityId,
    universitiesCollection,
    provincesCollection
}) => {
    let universityIds = [];

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

    return universityIds;
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
    limit,
    skip,
    provincesCollection = required('provincesCollection'),
    universitiesCollection = required('universitiesCollection'),
    programsCollection = required('programsCollection')
}) => {
    if (provinceId) {
        provinceId = convertToObjectId(provinceId);
    }

    if (universityId) {
        universityId = convertToObjectId(universityId);
    }

    const universityIds = await getUniversityIdsForOptions({
        province,
        university,
        provinceId,
        universityId,
        universitiesCollection,
        provincesCollection
    });

    if ((province || university) && !universityIds.length) {
        // We got some filters for province and university but we did not find any, so there are not programs for these params
        return [];
    }

    // Get programs with the optional filters
    const filters = getFilters(name, universityIds);

    // Build up the aggregation Operatiors
    const aggregationOperators = [
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
        },
        {
            $sort: {
                name: 1
            }
        }
    ];

    if (skip) {
        aggregationOperators.push({
            $skip: skip
        });
    }

    if (limit) {
        aggregationOperators.push({
            $limit: limit
        });
    }

    try {
        return await programsCollection.aggregate(aggregationOperators).toArray();
    } catch (e) {
        throw new RuntimeError({
            msg: `Error getting programs for filters: ${JSON.stringify(filters, null, 4)}`,
            err: e
        });
    }
};

export const countProgramsForFilter = async ({
    province,
    university,
    name,
    provinceId,
    universityId,
    provincesCollection = required('provincesCollection'),
    universitiesCollection = required('universitiesCollection'),
    programsCollection = required('programsCollection')
}) => {
    if (provinceId) {
        provinceId = convertToObjectId(provinceId);
    }

    if (universityId) {
        universityId = convertToObjectId(universityId);
    }

    const universityIds = await getUniversityIdsForOptions({
        province,
        university,
        provinceId,
        universityId,
        universitiesCollection,
        provincesCollection
    });

    if ((province || university) && !universityIds.length) {
        // We got some filters for province and university but we did not find any, so there are not programs for these params
        return 0;
    }

    // Get programs with the optional filters
    const filters = getFilters(name, universityIds);

    try {
        const results = await programsCollection.aggregate([ { $match: filters } ]).toArray();

        return results.length;
    } catch (e) {
        throw new RuntimeError({
            msg: `Error getting programs for filters: ${JSON.stringify(filters, null, 4)}`,
            err: e
        });
    }
}


// Get a document by Id for a given collection. Returns a promise. Does not do any population.
// Throws normal errors
// TODO: This should be in the db service
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

export const getUserByEmail = async({
    usersCollection = required('usersCollection'),
    email = required('email')
}) => {
    try {
        return await usersCollection.findOne({ email });
    } catch (e) {
        throw new RuntimeError({
            msg: `Error getting a user with the email ${email}`,
            err: e
        });
    }
};

export const getUserByReferralCode = async({
    usersCollection = required('usersCollection'),
    refId = required('refId')
}) => {
    try {
        return await usersCollection.findOne({ refId });
    } catch (e) {
        throw new RuntimeError({
            msg: `Error getting a user with the refId ${refId}`,
            err: e
        });
    }
};

// Get all the users
export const getUsers = async({
    usersCollection = required('usersCollection')
}) => {
    try {
        return await usersCollection.find().toArray();
    } catch (e) {
        throw new RuntimeError({
            msg: 'Error getting users',
            err: e
        });
    }
}

// Take a user and return a new object that includes when they joined and how long they have been a member for
export const populateMembershipInformation = async({
    user = required('user'),
    transactionsCollection = required('transactionsCollection')
}) => {
    // Find the transaction that made this user a member (if they are one)
    if (!user.isMember) {
        return user;
    }

    let membershipTransaction;

    try {
        membershipTransaction = await transactionsCollection.findOne({ userId: user._id, type: 'membership' });
    } catch (e) {
        throw new Error({
            msg: `Could not find a transactions for the mebership of user with ID: ${user._id}`,
            err: e
        });
    }

    return {
        ...user,
        memberSince: membershipTransaction.createdAt
    };
};

// Get Scholarship Applications, must pass in javascript date objects
export const getScholarshipApplicationsWithFilter = async({
    scholarshipApplicationsCollection = required('scholarshipApplicationsCollection'),
    userId,
    afterDate,
    beforeDate
}) => {
    const filters = {};

    if (userId) {
        filters.userId = convertToObjectId(userId);
    }

    if (afterDate) {
        filters.createdAt = {
            $gte: afterDate
        };
    }

    if (beforeDate) {
        // Be sure to create the createdAt property in the filters if it is not already there
        if (filters.createdAt) {
            filters.createdAt = {
                ...filters.createdAt,
                $lte: beforeDate
            };
        } else {
            filters.createdAt = {
                $lte: beforeDate
            };
        }
    }

    try {
        return await scholarshipApplicationsCollection.aggregate([
            {
                $match: filters
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'users'
                }
            }
        ]).toArray();
    } catch (e) {
        throw new RuntimeError({
            msg: 'Error getting users',
            err: e
        });
    }
}

export const getCurrentReferralPromos = async({
    referralPromosCollection = required('referralPromosCollection')
}) => {
    const now = new Date(moment().startOf('day').toISOString());

    // First get all the current promos
    try {
        return await referralPromosCollection.find({
            startDate: {
                $lte: now
            },
            endDate: {
                $gte: now
            }
        }).toArray();
    } catch (e) {
        throw new RuntimeError({
            msg: 'Error getting current referral promotions',
            err: e
        });
    }
};

// Returns the all the current promos with information about each referal associated with a particular user
export const getCurrentReferralInformationForUser = async({
    userId = required('userId'),
    referralsCollection = required('referralsCollection')
}) => {
    let result = [];
    const now = new Date(moment().startOf('day').toISOString());

    try {
        result = await referralsCollection.aggregate([
            {
                $match: {
                    refererId: userId
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'refereeId',
                    foreignField: '_id',
                    as: 'referees'
                }
            },
            {
                $lookup: {
                    from: 'referralPromos',
                    localField: 'promoId',
                    foreignField: '_id',
                    as: 'promos'
                }
            },
            {
                $project: {
                    promo: { $arrayElemAt: [ '$promos', 0 ]  },
                    referee: { $arrayElemAt: [ '$referees', 0 ]  }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'promo.winnerId',
                    foreignField: '_id',
                    as: 'promo.winners'
                }
            },
            {
                $project: {
                    promo: {
                        name: 1,
                        startDate: 1,
                        endDate: 1,
                        createdAt: 1,
                        threashold: 1,
                        winner: { $arrayElemAt: [ '$promo.winners', 0 ]  }
                    },
                    referee: 1
                }
            },
            {
                $match: {
                    'promo.startDate': {
                        $lte: now
                    },
                    'promo.endDate': {
                        $gte: now
                    }
                }
            },
            {
                $group: {
                    _id: '$promo',
                    referrals: { $push: '$referee' }
                }
            }
        ]).toArray();
    } catch (e) {
        throw new RuntimeError({
            msg: `Could not find current referral promotion information for user with ID: ${userId}`,
            err: e
        });
    }

    // Rename the unintuitive _id property to a more useful name of "promo"
    return result.map(x => ({
        promo: x._id,
        referrals: x.referrals
    }));
};

export const attributeReferral = async({
    refererId = required('refererId'),
    refereeId = required('refereeId'),
    referralsCollection = required('referralsCollection'),
    referralPromosCollection = required('referralPromosCollection')
}) => {
    // First get all the current promotions
    const currentPromos = await getCurrentReferralPromos({ referralPromosCollection });

    // Foreach current promo, insert a new referral for the referer
    try {
        await Promise.all(currentPromos.map(promo => insert({
            collection: referralsCollection,
            document: {
                promoId: promo._id,
                refererId,
                refereeId
            }
        })));
    } catch (e) {
        throw new RuntimeError({
            msg: `Could not update all current promos for referer with id: ${refererId}`,
            err: e
        });
    }
};
