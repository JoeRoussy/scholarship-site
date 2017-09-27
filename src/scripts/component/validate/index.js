// A collection of validation functions

import { email as emailRegex } from '../regex-constants';

export const isEmpty = (string) => !string;

export const isText = (string) => {
    // We accept strings and numbers as text
    if (!(typeof string === 'string' || typeof string === 'number')) {
        return false;
    }

    return !!string;
}

export const isEmail = (string) => {
    if (!isText(string)) {
        return false;
    }

    return emailRegex.test(string);
}

export const comparePasswords = (a, b) => {
    // We need to make sure both a and b are not empty strings
    if (!isText(a) && !isText(b)) {
        return false;
    }

    return a === b;
}
