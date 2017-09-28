// Validates the fields in all forms with a data-validate-form attribute.
// Each input with a data-validate attribute is validated. The value of the attribute defines the type of the input
import validateInput from '../validate-input';

export default () => {
    $('[data-validate-form]').each((i, e) => {
        const form = $(e);
        const inputsToValidate = form.find('[data-validate]');

        // Attach validation handlers to all the inputs
        inputsToValidate.each((index, el) => {
            const input = $(el);
            const inputType = input.attr('data-validate');

            if (!inputType) {
                return;
            }

            // Set errors after user leaves a field
            input.on('blur', (e) => {
                setErrorStates(input, validateInput(input));
            });

            // Always clear errors on focus
            input.on('focus', () => {
                setErrorStates(input, true);
            });
        });

        // Submit event handler
        form.find('input[type="submit"]').on('click', (event) => {
            event.preventDefault();

            // First, validate all the inputs, this takes care of the
            // case where a user hits submit before touching any fields
            inputsToValidate.each((index, el) => {
                const input = $(el);

                setErrorStates(input, validateInput(input));
            });

            const elementsWithError = form.find('input.error[data-validate]');

            if (!elementsWithError.length) {
                form.submit();
            }
        });
    })
}

// Set the display of inputs and input messages based on the validity of the input
function setErrorStates(input, isValid) {
    if (isValid) {
        // Need to remove the error class for the input and hide the message
        $(`#${input.attr('data-error-element-id')}`).removeClass('show');
        input.removeClass('error');
    } else {
        // Need to add the error class for the input and show the error message
        $(`#${input.attr('data-error-element-id')}`).addClass('show');
        input.addClass('error');
    }
}
