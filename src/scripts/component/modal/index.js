// Makes elements with a "data-modal" attribute open the modal with that ID
// Also opens modals containing forms with an error in them
export default () => {
    $('[data-modal]').each((index, e) => {
        const element = $(e);
        const modalId = element.attr('data-modal');
        const modal = $(`#${modalId}`);

        if (!modal.length) {
            return;
        }

        element.on('click', () => {
            modal.modal('show');
        });
    });

    $('.ui.modal').each((index, e) => {
        const modal = $(e);
        const form = modal.find('.ui.form.error');

        if (form.length) {
            modal.modal('show');
        }
    });
};
