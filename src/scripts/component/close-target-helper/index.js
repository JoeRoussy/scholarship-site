
const func = () => {
    $('[data-close-target]').each((i, e) => {
        const element = $(e);

        element.click(() => {
            $(`#${element.attr('data-close-target')}`).addClass('closed');
        });
    });
};

export default func;