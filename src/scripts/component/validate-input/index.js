// Validates an input based on its type.

import { isEmpty, isText, isEmail } from '../validate';

export default (element) => {
    const input = $(element);
    const inputType = input.attr('data-validate');

    if (!inputType) {
        throw new Error('You must pass an input with a data-validate attribute.');
    }

    switch (inputType) {
        case 'requied':
            return !isEmpty(input.val());
        case 'text':
            return isText(input.val());
        case 'email':
            return isEmail(input.val());
        default:
            throw new Error(`No validation available for input type ${inputType}`);
    }
}
