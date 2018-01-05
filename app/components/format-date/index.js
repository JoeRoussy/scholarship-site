import moment from 'moment';
import { required } from '../custom-utils';

// If a format is passed, it must provide english and french versions

export default ({
    date = required('date'),
    format,
    language = 'en'
}) => {
    let d = moment(date);
    let outputFormat;

    if (format == null) {
        if (language === 'fr') {
            outputFormat = 'D MMMM, YYYY'
        } else {
            outputFormat = 'MMMM D, YYYY';
        }
    } else {
        outputFormat = format[language];
    }

     d = d
         .locale(language)
         .format(outputFormat);

     if (language === 'fr') {
         // Add special text for a date on the first of the month and prepend the date with 'Le'
         d = 'Le ' + d;
         d = d.replace(' 1 ', ' 1<sup>er</sup> ');
     }

     return d;
};
