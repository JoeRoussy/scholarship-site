// Configures all the semantic ui calendars on the page according to their data attributes

export default () => {
    $('.ui.calendar').each((index, e) => {
        const element = $(e);

        const type = element.attr('data-type');
        const endcalendar = element.attr('data-end-calendar');
        const startcalendar = element.attr('data-start-calendar');

        if (!type) {
            console.error('Missing type value on date picker ', element);

            return;
        }

        let config = {};

        if (startcalendar) {
            config.startcalendar = startcalendar;
        } else if (endcalendar) {
            config.endcalendar = endcalendar;
        }

        element.calendar({
            type,
            ...config
        });
    });
}
