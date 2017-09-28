// Validates an input based on its type.

import { isEmpty, isText, isEmail, isEqualText } from '../validate';

export default (element) => {
    const input = $(element);
    const inputType = input.attr('data-validate');

    if (!inputType) {
        throw new Error('You must pass an input with a data-validate attribute.');
    }

    return validateForInputType(inputType, input);
}

function validateForInputType(type, input) {
    switch (type) {
        case 'requied':
            return !isEmpty(input.val());
        case 'text':
            return isText(input.val());
        case 'email':
            return isEmail(input.val());
        case 'equal':
            const elementToCompareId = input.attr('data-validation-target-id');

            if (!elementToCompareId) {
                throw new Error('Could not find element to compare id for input');
            }

            const elementToCompare = $(`#${elementToCompareId}`);

            if (!elementToCompare.length) {
                throw new Error(`Could not find other element with id ${elementToCompareId}`);
            }

            const elementToCompareType = elementToCompare.attr('data-validate');

            if (!elementToCompareType) {
                throw new Error('Element to comapre does not have an id');
            }

            if (!validateForInputType(elementToCompareType, elementToCompare)) {
                // If the other element is invalid, ignore this one so we don't spam the user
                return true;
            }

            return isEqualText(input.val(), elementToCompare.val())
        default:
            throw new Error(`No validation available for input type ${inputType}`);
    }
}
