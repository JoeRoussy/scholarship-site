import { required, print, RuntimeError } from '../custom-utils';

// Gets all programs with optional filters. If no province or university matches the filters,
// they are ignored
// TODO: Need to resolve universities into name for the return object
// TODO: Deal with catches
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

    // If a province was passed, try getting an id associated with it
    if (province) {
        try {
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
        } catch (e) {
            throw new RuntimeError({
                msg: `Error getting universities for province: ${province}`,
                err: e
            });
        }
    }

    // Get programs with the optional filters
    let filters = {};

    if (name) {
        filters = {
            name
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

    try {
        return await programsCollection.find(filters).toArray();
    } catch (e) {
        throw new RuntimeError({
            msg: `Error getting programs for filter: ${JSON.stringify(filter, null, 4)}`,
            err: e
        });
    }
};
