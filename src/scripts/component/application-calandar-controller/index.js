import { showWarning} from '../notification';
import urlHelper from 'url';

let startDate = null;
let endDate = null;

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

export const onStartChange = function (date) {
    if (endDate) {
        // Need to make sure this new start date is not after the current end date
        if (date > endDate) {
            onError($(this));

            // Cancel the change
            return false;
        }
    }

    startDate = date;
}

export const onEndChange = function (date) {
    if (startDate) {
        // Need to make sure this new end date is not before the current start date
        if (date < startDate) {
            onError($(this));

            // Cancel the change
            return false;
        }
    }

    endDate = date;
}

// When the update button is clicked, refresh the page with the appropriate filters
export const init = () => {
    const nameInput = $('#applicationsListingNameSearch input');
    const updateButton = $('#applicationListUpdateButton');

    if (!updateButton.length || !nameInput.length) {
        return;
    }

    updateButton.on('click', () => {
        const url = urlHelper.parse(window.location.href, true);

        if (startDate) {
            url.query.startDate = +startDate;
        } else {
            delete url.query.startDate;
        }

        if (endDate) {
            url.query.endDate = +endDate;
        } else {
            delete url.query.endDate;
        }

        if (!nameInput.val()) {
            delete url.query.userId;
        }

        // Build the query string based on the value of url.query
        url.search = null;

        window.location.href = urlHelper.format(url);
    });

    // Populate dates if they already exist
    const {
        startDate: defaultStartDate,
        endDate: defaultEndDate
    } = window.globals.queryParams;

    if (defaultStartDate) {
        const date = new Date(parseInt(defaultStartDate));

        $('#scholarshipApplicationListCalendarStart').calendar('set date', date, true, false);
        startDate = date;
    }

    if (defaultEndDate) {
        const date = new Date(parseInt(defaultEndDate));

        $('#scholarshipApplicationListCalendarEnd').calendar('set date', date, true, false);
        endDate = date;
    }
}
