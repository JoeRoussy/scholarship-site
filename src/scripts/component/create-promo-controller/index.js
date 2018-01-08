export const onChange = hiddenId => date => {
    const hiddenElement = $(`#${hiddenId}`);

    hiddenElement.val(+date);
};
