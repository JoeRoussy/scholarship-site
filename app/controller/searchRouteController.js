const csvParser = require('csv-parse');
const fs = require('fs');
const extend = require('extend');

exports.search = (req, res) => {
    const {
        university,
        name
    } = req.query;

    if (university || name) {
        fs.readFile(`${process.cwd()}/app/files/database_may_28.csv`, (err, csv) => {
            if (err) {
                return res.json({
                    err: true,
                    message: 'Could not read csv file'
                });
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
                ]
            }, (err, data) => {
                if (err) {
                    return res.json({
                        err: true,
                        message: 'Could not parse csv'
                    });
                }

                const programs = data.filter(program => {
                    if (!program.university) {
                        return false;
                    }

                    if (university && program.university != university) {
                        return false;
                    }

                    if (name && program.name.search(name) === -1) {
                        return false;
                    }

                    return true;
                });

                extend(res.locals, {
                    programs
                });

                return res.render('search');
            });
        });
    } else {
        return res.render('search');
    }
}
