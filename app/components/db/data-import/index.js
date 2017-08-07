import fs from 'fs';
import csvParser from 'csv-parse';
import { required, print } from '../../custom-utils';
import { getChildLogger } from '../../log-factory';
import { mapSeries } from 'bluebird';

/*
    KNOWN ISSUES:
    - First program from each university has its universityId set as null
    - First university has its provinceId set as null
*/

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

    console.log('Starting data import');

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
                'internationalTutition',
                'domesticeTuition',
                'minimumAverage',
                'length',
                'language',
                'toefl',
                'rank',
                'notes'
            ],
            from: 1, // Skip the heading row
            skip_empty_lines: true
        }, (err, data) => {
            if (err) {
                logger.error(err, 'Error parsing CSV');
                return;
            }

            const programsToAdd = data
                .filter(program => program.university) // Skip the empty lines in the file
                .reduce((accumulator, program) => {
                    accumulator.push({
                        ...program,
                        language: 'english'
                    });

                    return accumulator;
                }, []);

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
                    // Need to make a this province
                    province = await provinces.insertOne({
                        name: provinceName
                    });
                }

                let university = await universities.findOne({ name: universityName });

                if (!university) {
                    university = await universities.insertOne({
                        name: universityName,
                        provinceId: province._id,
                        language: 'english'
                    });
                }

                let programInsertResponse = await programs.insertOne({
                    name: programName,
                    ...programProperties,
                    universityId: university._id
                });
            });

            console.log('Done data import!');
        });
    });
}

export default func;
