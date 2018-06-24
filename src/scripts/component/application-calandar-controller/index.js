import urlHelper from 'url';
import { applicationCallbacks as applicationCallbacksController } from '../calendar-callbacks';

// When the update button is clicked, refresh the page with the appropriate filters
export const init = () => {
    const nameInput = $('#applicationsListingNameSearch input');
    const updateButton = $('#applicationListUpdateButton');

    if (!updateButton.length || !nameInput.length) {
        return;
    }

    updateButton.on('click', () => {
        const url = urlHelper.parse(window.location.href, true);

        const startDate = applicationCallbacksController.getStartDate();
        const endDate = applicationCallbacksController.getEndDate();
        const name = nameInput.val();

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

        if (name) {
            url.query.name = name;
        } else {
            delete url.query.name;
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
        applicationCallbacksController.setStartDate(date);
    }

    if (defaultEndDate) {
        const date = new Date(parseInt(defaultEndDate));

        $('#scholarshipApplicationListCalendarEnd').calendar('set date', date, true, false);
        applicationCallbacksController.setEndDate(date);
    }
}
