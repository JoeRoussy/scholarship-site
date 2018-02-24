import fs from 'fs';
import csvParser from 'csv-parse';
import { required, print } from '../../custom-utils';
import { getChildLogger } from '../../log-factory';
import { mapSeries } from 'bluebird';
import { insert } from '../service';


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
                'name',
                'internationalTuition',
                'domesticTuition',
                'minimumAverage',
                'length',
                'language',
                'toefl',
                'rank',
                'notes'
            ],
            from: 2, // Skip the heading row
            skip_empty_lines: true
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

                const {
                    province: provinceName,
                    university: universityName,
                    name: programName,
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
                    try {
                        university = await insert({
                            collection: universities,
                            document: {
                                name: universityName,
                                provinceId: province._id,
                                language: 'english'
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
            });

            logger.info('Done data import');
        });
    });
}

export default func;
