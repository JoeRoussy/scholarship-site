/*
    Provides functions to show error messages for date range pickers (composed of two date pickers).
    This modules returns a functions that provides callbacks, getters, and setters that are closures
    that have access to the current start and end date of the date range.
*/

import { showWarning} from '../notification';

function getErrorText(cal) {
    const title = cal.attr('data-error-title');
    const message = cal.attr('data-error-message');

    if (!title || !message) {
        throw new Error('Could not find error text for calendar');
    }

    return {
        title,
        message
    };
}

function onError(cal) {
    const {
        title,
        message
    } = getErrorText(cal);

    showWarning(title, message);
}

export default () => {
    let startDate = null;
    let endDate = null;

    return {
        onEndChange: function(cal, date) {
            if (startDate) {
                // Need to make sure this new end date is not before the current start date
                if (date < startDate) {
                    onError($(cal));

                    // Cancel the change
                    return false;
                }
            }

            endDate = date;

            return true;
        },
        onStartChange: function(cal, date) {
            if (endDate) {
                // Need to make sure this new start date is not after the current end date
                if (date > endDate) {
                    onError($(cal));

                    // Cancel the change
                    return false;
                }
            }

            startDate = date;

            return true;
        },
        getStartDate: () => startDate,
        getEndDate: () => endDate,
        setStartDate: (date) => startDate = date,
        setEndDate: (date) => endDate = date
    };
}
