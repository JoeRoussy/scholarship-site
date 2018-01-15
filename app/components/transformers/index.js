/*
    This module contains a bunch of functions to transform objects from verbose
    formats returned by the db to something that can be consumed (as repoonses)
    from an api for example
*/

export const transformProgramForOutput = program => {
    const {
        universities: [
            {
                name: universityName,
                _id: uId,
                latitude,
                longitude
            }
        ],
        universityId,
        language,
        ...programProps
    } = program;

    return {
        university: {
            _id: uId,
            name: universityName,
            latitude,
            longitude
        },
        ...programProps
    };
}

export const transformUniversityForOutput = university => {
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

export const transformUserForOutput = user => {
    const {
        password,
        isAdmin,
        ...userProps
    } = user;

    return {
        ...userProps
    };
}

export const transformScholarshipApplicationForOutput = application => {
    const {
        users: [
            {
                _id: uId,
                name: uName
            }
        ],
        userId,
        ...applicationProps
    } = application;

    return {
        ...applicationProps,
        user: {
            _id: uId,
            name: uName
        }
    }
}

/*
    Transforms promos with referral information of the form:
    {
        promo: {},
        referrals: [  ] // Array of users
    }
*/
export const transformPromoForOutput = p => {
    const {
        promo: {
            winner,
            ...promoProps
        } = {},
        referrals
    } = p;

    const transformedPromo = {
        winner: winner ? transformUserForOutput(winner) : null,
        ...promoProps
    };

    return {
        promo: transformedPromo,
        referrals: referrals.map(transformUserForOutput)
    };
}
