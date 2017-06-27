const csvParser = require('csv-parse');
const fs = require('fs');

exports.search = (req, res) => {
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

            const {
                university,
                name
            } = req.query;

            const returnValue = data.filter(program => {
                if (university && program.university != university) {
                    return false;
                }

                if (name && program.name.search(name) === -1) {
                    return false;
                }

                return true;
            });

            res.json(returnValue);
        });
    });
}
