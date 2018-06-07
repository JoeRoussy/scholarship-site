/*
    This module has functions that take raw data from the db and return it in a way that is useful for plots on the front end
*/

import moment from 'moment';
import { print } from '../custom-utils';

const formatAsDate = (date) => moment(date).format('MMMM D YYYY');

export const formatForUserRegistraction = data => {
    // Find total range of dates we are dealing with
    const sortedData = data.sort((a, b) => moment(a).isAfter(moment(b)) ? 1 : -1);
    const minDate = moment(sortedData[0].createdAt).startOf('day');
    const maxDate = moment().subtract(1, 'days').startOf('day');

    let memberData = {};
    let userData = {};
    let currentDate = minDate;

    while (currentDate.isSameOrBefore(maxDate)) {
        memberData[formatAsDate(currentDate)] = 0;
        userData[formatAsDate(currentDate)] = 0;
        currentDate = moment(currentDate.add(1, 'days'));
    }

    // Now set the values of the user and member data sets
    sortedData.forEach(registration => {
        const registrationDate = formatAsDate(registration.createdAt);

        if (registration.isMember) {
            memberData[registrationDate]++;
        }

        userData[registrationDate]++;
    });

    return {
        memberData,
        userData
    };
};

export const formatForScholarshipApplications = data => {
    // Find total range of dates we are dealing with
    const sortedData = data.sort((a, b) => moment(a).isAfter(moment(b)) ? 1 : -1);
    const minDate = moment(sortedData[0].createdAt).startOf('day');
    const maxDate = moment().subtract(1, 'days').startOf('day');

    let formattedData = {};
    let currentDate = minDate;

    while (currentDate.isSameOrBefore(maxDate)) {
        formattedData[formatAsDate(currentDate)] = 0;
        currentDate = moment(currentDate.add(1, 'days'));
    }

    // Now set the values of the formatted data set
    sortedData.forEach(application => {
        const applicationDate = formatAsDate(application.createdAt);
        formattedData[applicationDate]++;
    });

    return formattedData;
};