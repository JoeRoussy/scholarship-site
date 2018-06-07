
const func = () => {
    $('[data-set-text-as-href]').each((index, element) => {
        element.text = element.href;
    });
};

export default func;