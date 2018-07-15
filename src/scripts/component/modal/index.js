// Makes elements with a "data-modal" attribute open the modal with that ID
// Also opens modals containing forms with an error in them
export default ({ idsToOpenOnLoad = [] }) => {
    $('[data-modal]').each((index, e) => {
        const element = $(e);
        const modalId = element.attr('data-modal');
        const modal = $(`#${modalId}`);

        if (!modal.length) {
            return;
        }

        element.on('click', (e) => {
            if (element.attr('href')) {
                // This is a link and we don't want to follow it
                e.preventDefault();
            }

            modal.modal('show');
        });
    });

    // Any modals being redered with an error should be shown
    $('.ui.modal').each((index, e) => {
        const modal = $(e);
        const form = modal.find('.ui.form.error');

        if (form.length) {
            modal.modal('show');
        }
    });

    // Any modals set to be shown on load also need to be shown if they are on the page
    idsToOpenOnLoad.forEach(id => {
        $(`#${id}`).modal('show');
    });
};
