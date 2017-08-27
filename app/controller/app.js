
import { getProgramsWithFilter } from '../components/data';
import { ObjectId } from 'mongodb';
import { transformProgramForOutput } from '../components/transformers';
import { print, sortByKey } from '../components/custom-utils';

export const search = ({
    provincesCollection = required('provincesCollection', 'You must pass in the provinces db collection'),
    universitiesCollection = required('universitiesCollection', 'You must pass in the universities db collection'),
    programsCollection = required('programsCollection', 'You must pass in the programs db collection'),
}) => (req, res) => {
    const {
        province,
        university,
        name,
        provinceId,
        universityId
    } = req.query;

    if (provinceId && !ObjectId.isValid(provinceId)) {
        // TODO: Render error
    }

    if (universityId && !ObjectId.isValid(universityId)) {
        // TODO: Render error
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
            if (programs.count === 0) {
                // TODO: Render error
            }

            res.locals.programs = programs
                    .map(transformProgramForOutput)
                    .sort(sortByKey('name'));

            // Send info about the search to the front end for display purposes
            const [ firstProgram ] = res.locals.programs;
            res.locals.searchInfo = {};

            if (universityId) {
                res.locals.searchInfo.university = firstProgram.university.name;
            } else if (province) {
                res.locals.searchInfo.province = province;
            } else if (name) {
                res.locals.searchInfo.name = name;
            }

            return res.render('search', res.locals);
        });
};

export const home = (req, res) => {
    res.render('home');
};

export const aboutUs = (req, res) => {
     res.render('about');
};

export const contact = (req, res) => {
     res.render('contact');
};

export const programDetails = ({

}) => (req, res) => {
    const {
        programId
    } = req.params;

    print(res.locals);

    // TODO: Get program details

    res.locals.program = {
        name: 'Test Program',
        internationalTuition: '$20000',
        domesticTuition: '$20000',
        minimumAverage: "Low to Mid 80s",
        length: "3-5 years",
        language: "english",
        toefl: "580, 5 on the Test of Written English",
        rank: "",
        notes: "",
        university: {
            name: "A really awesome university",
            latitude: 43.008289,
            longitude: -81.271894
        }
    };


    res.render('programDetails');
};
