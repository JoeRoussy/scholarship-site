import moment from 'moment';
import { insert, findAndUpdate } from '../db/service';
import {
    required,
    print,
    RuntimeError,
    intersectIfPopulated,
    convertToObjectId,
    getRegex
} from '../custom-utils';
import { free } from '../populate-session';
import { generateHash } from '../authentication';
import { get as getHash } from '../hash';

// NOTE: Functions in this module will return verbose data and the caller can clean it if they wish

// TODO: This file is getting pretty long, should refactor it without changing signature and make it a dispatcher

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

const getTargetDateForTimeFrame = (timeFrame) => {
    if (timeFrame === 'week') {
        return moment().startOf('day').subtract(1, 'weeks');
    } else if (timeFrame === 'month') {
        return moment().startOf('day').subtract(1, 'months');
    } else if (timeFrame === 'year') {
        return moment().startOf('day').subtract(1, 'years');
    } else {
        throw new Error(`${timeFrame} is not a valid timeframe. Must be 'week', 'month', or 'year'`);
    }
}

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
    // We use unwind after a lookup where we know there will be only one
    // value as a bit of a hacky join without getting an array of universities for each program
    const aggregationOperators = [
        {
            $match: filters
        },
        {
            $lookup: {
                from: 'universities',
                localField: 'universityId',
                foreignField: '_id',
                as: 'university'
            }
        },
        {
            $unwind: '$university'
        },
        {
            $lookup: {
                from: 'provinces',
                localField: 'university.provinceId',
                foreignField: '_id',
                as: 'university.province'
            }
        },
        {
            $unwind: '$university.province'
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
                    as: 'university'
                }
            },
            {
                $unwind: '$university'
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

// Get all the users that are not admins
export const getNonAdminUsers = async({
    usersCollection = required('usersCollection')
}) => {
    try {
        return await usersCollection.find({
            isAdmin: {
                $ne: true
            }
        }).toArray();
    } catch (e) {
        throw new RuntimeError({
            msg: 'Error getting non admin users',
            err: e
        });
    }
}

// Search for a user by email or name
export const searchUserByEmailOrName = async({
    usersCollection = required('usersCollection'),
    email,
    name
}) => {
    if (!email && !name) {
        throw new Error('You need to either pass a name or an email');
    }

    let query = {};

    if (email) {
        query.email = {
            $regex: getRegex(email),
            $options: 'i'
        };
    }

    if (name) {
        query.name = {
            $regex: getRegex(name),
            $options: 'i'
        };
    }

    try {
        return await usersCollection.find(query).toArray();
    } catch (e) {
        throw new RuntimeError({
            msg: 'Error getting users with query',
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

// Returns all the promos with information about how may users are eligible for that promotion
export const getAllReferralPromos = async({
    referralPromosCollection = requried('referralPromosCollection')
}) => {
    let promos = [];

    // First get all the promos including all referral associated with each promo
    try {
        promos = await referralPromosCollection.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'winnerId',
                    foreignField: '_id',
                    as: 'winners'
                }
            },
            {
                $project: {
                    name: 1,
                    startDate: 1,
                    endDate: 1,
                    createdAt: 1,
                    threashold: 1,
                    winner: { $arrayElemAt: [ '$winners', 0 ] }
                }
            },
            {
                $lookup: {
                    from: 'referrals',
                    localField: '_id',
                    foreignField: 'promoId',
                    as: 'referrals'
                }
            }
        ]).toArray();
    } catch (e) {
        throw new RuntimeError({
            err: e,
            msg: 'Error finding all referral promotions'
        });
    }

    // Takes each promo and add a field to indicate how many users are eligible for that promo
    const mappedPromos = promos.map(promo => {
        const {
            referrals,
            threashold,
            ...promoProps
        } = promo;

        const eligibility = referrals.reduce((accumulator, current) => {
            // Does the accumulator have an element for the current referal?
            if (accumulator[current.referrerId]) {
                // We are going to increment the count of this element
                ++accumulator[current.referrerId];
            } else {
                // Intorduce a new element
                accumulator[current.referrerId] = 1;
            }

            return accumulator;
        }, {});

        // Now find how many users are eligible for this promotion
        const numberEligible = Object.keys(eligibility).reduce((accumulator, current) => {
            if (eligibility[current] >= threashold) {
                return ++accumulator;
            }

            return accumulator;
        }, 0);

        // Also include potential winners for the current promo
        // For these purposes, a winner would be anyone who has the most referrals that is above the threashold for the
        // promo. It is an array incase there is a tie for first place.
        let currentMax = -1;

        const contenderIds = Object.keys(eligibility).reduce((accumulator, current) => {
            if (eligibility[current] >= currentMax && eligibility[current] >= threashold) {
                accumulator.push(current);
                currentMax = eligibility[current];
            }

            return accumulator;
        }, []);

        const newPromo = {
            numberEligible,
            threashold,
            ...promoProps   
        };

        if (newPromo.winner || !contenderIds.length) {
            // We do not need to include the "winner ids" because we have already computed a winner or there is no possible winners
            return newPromo;
        }

        // We have not assigned a winner so we should include the contender ids
        return {
            contenderIds,
            ...newPromo
        };
    });

    return mappedPromos;
}

// Returns the all the current promos with information about each referral associated with a particular user
export const getCurrentReferralInformation = async({
    userId = required('userId'),
    referralsCollection = required('referralsCollection'),
    referralPromosCollection = requried('referralPromosCollection')
}) => {
    let currentPromos = [];
    let referrals = [];
    const now = new Date(moment().startOf('day').toISOString());

    // Find all the current promos
    try {
        currentPromos = await referralPromosCollection.aggregate([
            {
                $match: {
                    startDate: {
                        $lte: now
                    },
                    endDate: {
                        $gte: now
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'winnerId',
                    foreignField: '_id',
                    as: 'winners'
                }
            },
            {
                $project: {
                    name: 1,
                    startDate: 1,
                    endDate: 1,
                    createdAt: 1,
                    threashold: 1,
                    winner: { $arrayElemAt: [ '$winners', 0 ] }
                }
            }
        ]).toArray();
    } catch (e) {
        throw new RuntimeError({
            err: e,
            msg: 'Error finding current referral promotions'
        });
    }

    // Now find any referrals that are associated with this user
    try {
        referrals = await referralsCollection.aggregate([
            {
                $match: {
                    referrerId: userId
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'referreeId',
                    foreignField: '_id',
                    as: 'referrees'
                }
            },
            {
                $project: {
                    promoId: 1,
                    referrerId: 1,
                    createdAt: 1,
                    referree: { $arrayElemAt: [ '$referrees', 0 ]  }
                }
            },
            {
                $group: {
                    _id: '$promoId',
                    referrals: { $push: '$referree' }
                }
            }
        ]).toArray()
    } catch (e) {
        throw new RuntimeError({
            msg: 'Could not find current referral information',
            err: e
        });
    }

    // Rename the unintuitive _id property to a more useful name of "promoId"
    const formattedReferrals = referrals.map(x => ({
        promoId: x._id,
        referrals: x.referrals
    }));

    // Go through the currentPromos and find any referrals for that promo in the referrals array
    return currentPromos.map(promo => {
        const {
            _id: promoId
        } = promo;

        const [ referralInfo ] = formattedReferrals.filter(x => x.promoId.equals(promoId));

        return {
            ...promo,
            referrals: referralInfo ? referralInfo.referrals : []
        }
    });
};

export const attributeReferral = async({
    referrerId = required('referrerId'),
    referreeId = required('referreeId'),
    referralsCollection = required('referralsCollection'),
    referralPromosCollection = required('referralPromosCollection')
}) => {
    // First get all the current promotions
    const currentPromos = await getCurrentReferralPromos({ referralPromosCollection });

    // Foreach current promo, insert a new referral for the referrer
    try {
        await Promise.all(currentPromos.map(promo => insert({
            collection: referralsCollection,
            document: {
                promoId: promo._id,
                referrerId,
                referreeId
            }
        })));
    } catch (e) {
        throw new RuntimeError({
            msg: `Could not update all current promos for referrer with id: ${referrerId}`,
            err: e
        });
    }
};

// NOTE: This function returns a user as the winner in a format appropriate to send to the front end (no transformer needed)
// Does not modify the promo collection to indicate the winner
export const getWinnerForPromo = async({
    promoId = required('promoId'),
    referralsCollection = required('referralsCollection'),
    referralPromosCollection = required('referralPromosCollection')
}) => {
    promoId = convertToObjectId(promoId);

    // We need to find all the users that are eligible for this promo
    let promo;
    let eligibleUsers;

    // First find the promo in question
    try {
        promo = await getDocById({
            collection: referralPromosCollection,
            id: promoId
        });
    } catch (e) {
        throw new RuntimeError({
            err: e,
            msg: `Could not find promo with id: ${promoId}`
        });
    }

    // Find all eligible users for this promo (more referrals than the threashold)
    eligibleUsers = await referralsCollection.aggregate([
        {
            $match: {
                promoId
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'referrerId',
                foreignField: '_id',
                as: 'referrers'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'referreeId',
                foreignField: '_id',
                as: 'referrees'
            }
        },
        {
            $project: {
                referree: { $arrayElemAt: [ '$referrees', 0 ] },
                referrer: { $arrayElemAt: [ '$referrers', 0 ] }
            }
        },
        {
            $group: {
                _id: '$referrer',
                referrals: { $push: '$referree' }
            }
        },
        {
            $project: {
                lengthOfReferrals: { $size: '$referrals' }
            }
        },
        {
            $match: {
                lengthOfReferrals: { $gte: promo.threashold }
            }
        },
        {
            $project: {
                _id: '$_id._id',
                name: '$_id.name',
                email: '$_id.email',
                lengthOfReferrals: 1
            }
        }
    ]).toArray();

    // Figure out who can win and if there is a tie for first
    const maxReferals = eligibleUsers.reduce((accumulator, current) => {
        if (current.lengthOfReferrals > accumulator) {
            return current.lengthOfReferrals;
        }

        return accumulator;
    }, -1);

    const potentialWinners = eligibleUsers.filter(x => x.lengthOfReferrals === maxReferals);

    // Pick one of the people tied for the win at random
    // NOTE: This also handles the case where there is only one potential winner
    const index = Math.floor(Math.random() * potentialWinners.length);

    return potentialWinners[index];
}

// Gets the current exchange rates
export const getCurrentExchangeRates = async({
    exchangeRatesCollection = required('exchangeRatesCollection')
}) => {
    // Dates are always saved by start of day
    const now = new Date(moment().startOf('day').toISOString());
    const currentRates = await exchangeRatesCollection.find({ validOn: now }).toArray();
    const [ result ] = currentRates;

    if (!result) {
        return null;
    }

    return result.rates;
}

export const getSearchForUserId = async({
    searchesCollection = required('searchesCollection'),
    userId = required('userId')
}) => {
    try {
        return await searchesCollection.findOne({ userId });
    } catch (e) {
        throw new RuntimeError({
            err: e,
            msg: `Could not find search for user with id: ${userId}`
        });    
    }
};

export const processReferrals = async({
    refId,
    req = required('req'),
    usersCollection = required('usersCollection'),
    referralPromosCollection = required('referralPromosCollection'),
    referralsCollection = required('referralsCollection'),
    newUser = required('newUser')
}) => {
    // Now that the user has been made, see if we need to credit anyone with a referral
    if (refId) {
        let referrer = null;

        try {
            referrer = await getUserByReferralCode({
                usersCollection,
                refId
            });
        } catch (e) {
            throw new RuntimeError({
                err: e,
                msg: `Could not find user with refId: ${redId}`
            });
        }

        if (referrer) {
            // Update any promos going on now to have this new user as eligible
            try {
                await attributeReferral({
                    referrerId: referrer._id,
                    referreeId: newUser._id,
                    referralPromosCollection,
                    referralsCollection
                });
            } catch (e) {
                throw new RuntimeError({
                    err: e,
                    msg: `Error attributing referral for user with refId: ${redId} for new user with id: ${newUser._id}`
                });
            }
        }

        free(req.session, 'refId');
    }

    return true;
};

// Makes a user in the db and returns a promise for saving it in the db
// Will hash password before saving it (if present) and will also assign a ref id for referrals
// Saved provider information of this is a third party sign in
export const createUser = async({
    name = required('name'),
    email = required('email'),
    password,
    provider,
    providerId,
    caslConfirmation,
    usersCollection = required('usersCollection')
}) => {
    // Make sure we have all the information we need
    if (!password && !(provider || providerId)) {
        throw new Error('If you don\'t pass a password for a created user you need to pass a provider and a provider id from the thrid party auth service');
    }

    let newUser = {
        name,
        email,
        caslConfirmation
    };

    if (password) {
        // This is a local sign in. We need to hash the password
        const hashedPassword = await generateHash(password);

        newUser = {
            ...newUser,
            password: hashedPassword
        };
    } else {
        // This is an external sign in. We need to save the provider information
        newUser = {
            ...newUser,
            provider,
            providerId
        };
    }

    // Every user needs a ref id
    newUser = {
        ...newUser,
        refId: getHash({ input: email })
    };


    // Now try and save the user to the db
    return insert({
        collection: usersCollection,
        document: newUser,
        returnInsertedDocument: true
    });
}

// Updates a new user with a name and email (both optional) and returns a promise for a new user
export const updateUser = ({
    usersCollection = required('usersCollection'),
    userId = required('userId'),
    name,
    email
}) => {
    let update = {};

    if (name) {
        update = {
            ...update,
            name
        };
    }

    if (email) {
        update = {
            ...update,
            email
        };
    }

    try {
        return findAndUpdate({
            collection: usersCollection,
            query: {
                _id: userId
            },
            update
        });
    } catch (e) {
        throw new RuntimeError({
            err: e,
            msg: `Could not update user with name: ${name} and email: ${email}`
        });
    }
};

export const deleteUser = async({
    usersCollection = required('usersCollection'),
    referralsCollection = required('referralsCollection'),
    userId = required('userId')
}) => {
    // Delete any referrals pointing to this user
    try {
        await referralsCollection.deleteMany({ referreeId: userId });
    } catch (e) {
        throw new RuntimeError({
            err: e,
            msg: `Could not delete the referrals pointing to the user with id: ${userId}`
        });
    }

    // Delete this user's referrals
    try {
        await referralsCollection.deleteMany({ referrerId: userId });
    } catch (e) {
        throw new RuntimeError({
            err: e,
            msg: `Could not delete the could not delete the referrals of the user with id: ${userId}`
        });
    }

    // Delete this user's profile
    try {
        await usersCollection.findOneAndDelete({ _id: userId });
    } catch (e) {
        throw new RuntimeError({
            err: e,
            msg: `Could not delete user with id ${userId}`
        });
    }
};

export const editPassword = async({
    usersCollection = required('usersCollection'),
    userId = required('userId'),
    newPassword = required('newPassword')
}) => {
    // Hash the password
    const hashedPassword = await generateHash(newPassword);

    try {
        return findAndUpdate({
            collection: usersCollection,
            query: {
                _id: userId
            },
            update: {
                password: hashedPassword
            }
        });
    } catch (e) {
        throw new RuntimeError({
            err: e,
            msg: 'Could not update password'
        });
    }
}

export const getPersonalData = async({
    usersCollection = required('usersCollection'),
    userId = required('userId')
}) => {
    let result = null;

    try {
        result = await usersCollection.aggregate([
            {
                $match: {
                    _id: userId
                }
            },
            {
                $lookup: {
                    from: 'referrals',
                    localField: '_id',
                    foreignField: 'referrerId',
                    as: 'referrals'
                }
            },
            {
                $lookup: {
                    from: 'scholarshipApplications',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'scholarshipApplications'
                }
            }
        ]).toArray()
    } catch (e) {
        throw new RuntimeError({
            err: e,
            msg: `Could not get personal data for user with id ${userId}`
        });
    }

    return result[0];
}

export const getNewUsersInPastTimeFrame = async({
    usersCollection = required('usersCollection'),
    timeFrame = required('timeFrame')
}) => {
    let users = [];

    let today = moment().startOf('day');
    let targetDate = getTargetDateForTimeFrame(timeFrame);

    try {
        // Only get up to yesterday
        users = await usersCollection.find({
            createdAt: {
                $gte: new Date(targetDate.toISOString()),
                $lt: new Date(today.toISOString())
            }
        }).toArray();
    } catch (e) {
        throw new RuntimeError({
            err: e,
            msg: `Could not find users with the timeframe: ${timeFrame}`
        });
    }

    return users;
}

export const getTotalScholarshipApplicationCount = async({
    scholarshipApplicationsCollection = required('scholarshipApplicationsCollection')
}) => {
    try {
        return await scholarshipApplicationsCollection.count();
    } catch (e) {
        throw new RuntimeError({
            err: e,
            msg: 'Error counting total number of scholarship applications'
        });
    }
}

export const getYearlyScholarshipApplicationCount = async({
    scholarshipApplicationsCollection = required('scholarshipApplicationsCollection')
}) => {
    try {
        return await scholarshipApplicationsCollection.count({
            createdAt: {
                $gte: new Date(moment().subtract(1, 'years').toISOString())
            }
        });
    } catch (e) {
        throw new RuntimeError({
            err: e,
            msg: 'Error counting total number of scholarship applications'
        });
    }
}

export const getScholarshipApplicationsInPastTimeFrame = async({
    scholarshipApplicationsCollection = required('scholarshipApplicationsCollection'),
    timeFrame = required('timeFrame')
}) => {
    let applications = [];

    let today = moment().startOf('day');
    let targetDate = getTargetDateForTimeFrame(timeFrame);

    try {
        // Only get up to yesterday
        applications = await scholarshipApplicationsCollection.find({
            createdAt: {
                $gte: new Date(targetDate.toISOString()),
                $lt: new Date(today.toISOString())
            }
        }).toArray();
    } catch (e) {
        throw new RuntimeError({
            err: e,
            msg: `Could not find scholarship applications with the timeframe: ${timeFrame}`
        });
    }

    return applications;
}

