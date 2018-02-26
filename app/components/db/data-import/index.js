import fs from 'fs';
import csvParser from 'csv-parse';
import geolib from 'geolib';

import { required, print } from '../../custom-utils';
import { getChildLogger } from '../../log-factory';
import { mapSeries } from 'bluebird';
import { insert } from '../service';
import config from '../../../config';

const {
    regex: {
        sexagesimalPattern
    } = {}
} = config;

if (!sexagesimalPattern) {
    throw new Error('Missing sexagesimalPattern from config');
}

const func = async ({
    spreadsheetPath = required('spreadsheetPath'),
    baseLogger = required('baseLogger'),
    collections: {
        provinces = required('Provinces', 'You must pass a province collection'),
        universities = required('Universities', 'You must pass a universities collection'),
        programs = required('Programs', 'You must pass a programs collection')
    } = {}
}) => {
    const logger = getChildLogger({
        baseLogger,
        additionalFields: {
            module: 'db-data-import'
        }
    });

    logger.info('Starting data import');

    const fullFilePath = `${process.cwd()}/${spreadsheetPath}`;

    fs.readFile(fullFilePath, (err, csv) => {
        if (err) {
            logger.error(err, `Error reading file: ${fullFilePath}`)
            return;
        }

        csvParser(csv, {
            columns: [
                'province',
                'university',
                'program',
                'internationalTuition',
                'domesticTuition',
                'minimumAverage',
                'length',
                'language',
                'toefl',
                'rank',
                'notes',
                'longitude',
                'latitude',
                'link'
            ],
            from: 2, // Skip the heading row
            skip_empty_lines: true,
            relax: true // Preserve quotes (for long and lat)
        }, (err, data) => {
            if (err) {
                logger.error(err, 'Error parsing CSV');
                return;
            }

            const programsToAdd = data
                .filter(program => program.university)
                .map(program => ({
                    ...program,
                    language: 'english'
                }));

            mapSeries(programsToAdd, async (program) => {
                /*
                    - Find the province and if it does not exist create it
                    - Find the university and if it does not exist create it
                    - Create the program
                    - Log the creation of the program
                */

                let {
                    province: provinceName,
                    university: universityName,
                    program: programName,
                    link: universityLink,
                    longitude,
                    latitude,
                    ...programProperties
                } = program;

                let province = await provinces.findOne({ name: provinceName });

                if (!province) {
                    // Need to make a this province first
                    try {
                        province = await insert({
                            collection: provinces,
                            document: {
                                name: provinceName
                            },
                            returnInsertedDocument: true
                        });
                    } catch (e) {
                        const message = `Error inserting province with name: ${provinceName}`
                        logger.error(e, message);

                        throw new Error(message);
                    }

                    logger.info(province, 'Inserted a province');
                }

                let university = await universities.findOne({ name: universityName });

                if (!university) {
                    // Need to create this university first

                    // If the latitude and longitude are not in decimal form, we need
                    // to convert it
                    if (sexagesimalPattern.test(longitude)) {
                        // We need to convert to decimal from
                        longitude = geolib.sexagesimal2decimal(longitude);
                    } else {
                        // We just need to parse the number which is currently in a string format
                        longitude = parseFloat(longitude);
                    }

                    if (sexagesimalPattern.test(latitude)) {
                        // We need to convert to decimal from
                        latitude = geolib.sexagesimal2decimal(latitude);
                    } else {
                        // We just need to parse the number which is currently in a string format
                        latitude = parseFloat(latitude);
                    }

                    try {
                        university = await insert({
                            collection: universities,
                            document: {
                                name: universityName,
                                provinceId: province._id,
                                language: 'english',
                                latitude,
                                longitude,
                                link: universityLink
                            },
                            returnInsertedDocument: true
                        });
                    } catch (e) {
                        const message = `Error inserting university with name: ${universityName}`
                        logger.error(e, message);

                        throw new Error(message);
                    }

                    logger.info(university, 'Inserted a university')
                }

                // Now we can save the program
                let programDocument;

                try {
                    programDocument = await insert({
                        collection: programs,
                        document: {
                            name: programName,
                            ...programProperties,
                            universityId: university._id
                        },
                        returnInsertedDocument: true
                    });
                } catch (e) {
                    const message = `Error inserting program with name: ${programName}`
                    logger.error(e, message);

                    throw new Error(message);
                }

                logger.info(programDocument, 'Inserted a program');
            })
                .then(() => {
                    logger.info('Done data import');
                });
        });
    });
}

export default func;
