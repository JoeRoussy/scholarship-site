import { showWarning} from '../notification';
import urlHelper from 'url';

let startDate = null;
let endDate = null;
let updateButton = null;

// TODO: Add controls for start and end dates

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

    if (updateButton.length) {
        updateButton.prop('disabled', false);
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

    if (updateButton.length) {
        updateButton.prop('disabled', false);
    }

    endDate = date;

}

// When the update button is clicked, refresh the page with the appropriate filters
export const init = () => {
    updateButton = $('#applicationListUpdateButton');

    if (!updateButton.length) {
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

        // Build the query string based on the value of url.query
        url.search = null;

        window.location.href = urlHelper.format(url);
    });
}
