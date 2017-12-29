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

        if (id) {
            const onChange = calendarCallbacks(id, 'onChange');

            if (typeof onChange == 'function') {
                config.onChange = onChange;
            } else {
                throw new Error(`Did not get a function back from the calendar callback module for element with id: ${id}`);
            }
        }

        element.calendar({
            type,
            ...config
        });
    });
}
