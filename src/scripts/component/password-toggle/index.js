// Finds elements with a data-password-toggle-target-name attr and binds a click event listener
// on them. This listener finds the element with a name equal to the data attribute value and
// toggles the type of the input as approriate

export default () => {
    $('[data-password-toggle-target-id]').on('click', (e) => {
        const element = $(e.target);
        let passwordInputId = element.attr('data-password-toggle-target-id');

        // If the id attribute was not present on this element, find it in a parent
        // This can occur if a child of the element with the id attribute was clicked
        if (!passwordInputId) {
            passwordInputId = element
                    .parents('[data-password-toggle-target-id]')
                    .attr('data-password-toggle-target-id');
        }

        const passwordInput = $(`#${passwordInputId}`);

        if (passwordInput.length) {
            const currentType = passwordInput.attr('type');

            if (currentType === 'password') {
                passwordInput.attr('type', 'text');
            } else {
                passwordInput.attr('type', 'password');
            }
        }
    });
};
