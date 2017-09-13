// Makes elements with a "data-modal" attribute open the modal with that ID
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
};
