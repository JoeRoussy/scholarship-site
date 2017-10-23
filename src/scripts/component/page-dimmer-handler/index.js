
export default () => {
    $('[data-show-dimmer-on-click]').each((index, e) => {
        const element = $(e);

        element.click(() => {
            $(`#${element.attr('data-show-dimmer-on-click')}`).dimmer('toggle');
        });
    });
};
