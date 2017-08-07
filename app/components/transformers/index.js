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
