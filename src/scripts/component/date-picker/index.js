// Configures all the semantic ui calendars on the page according to their data attributes

import calendarCallbacks from '../calendar-callbacks';

export default () => {
    $('.ui.calendar').each((index, e) => {
        const element = $(e);

        const id = element.attr('id');
        const type = element.attr('data-type');
        const endCalendar = element.attr('data-end-calendar');
        const startCalendar = element.attr('data-start-calendar');
        const isPastSelector = element.attr('data-is-past-selector');
        const callbackTypesStr = element.attr('data-callback-types');

        let callbackTypes = [];

        if (callbackTypesStr) {
            callbackTypes = JSON.parse(callbackTypesStr);
        }

        if (!type) {
            console.error('Missing type value on date picker ', element);

            return;
        }

        let config = {
            closeable: true
        };

        if (isPastSelector) {
            config.maxDate = new Date();
        }

        if (startCalendar) {
            config.startcalendar = startCalendar;
        } else if (endCalendar) {
            config.endcalendar = endCalendar;
        }

        if (id && callbackTypes.length) {
            callbackTypes.forEach(callbackType => {
                const callback = calendarCallbacks(id, callbackType);

                if (typeof callback === 'function') {
                    config[callbackType] = callback;
                } else {
                    throw new Error(`Did not get a function back from the calendar callback module for element with id: ${id} and callback type: ${callbackType}`);
                }
            });
        }

        element.calendar({
            type,
            ...config
        });
    });
}
