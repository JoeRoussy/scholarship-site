import { ObjectId } from 'mongodb';

export const required = (param, customMessage) => {
    if (typeof customMessage === 'string') {
        throw new Error(`could not find required param: ${param}. ${customMessage}`);
    } else {
        throw new Error(`${param} is required`);
    }
}

export class RuntimeError extends Error {
    constructor({ msg, err }) {
        super(msg);
        Error.captureStackTrace(this, RuntimeError); // This takes the ctor for this class out of the stack trace

        this.msg = msg;
        this.err = err;
    }
}

export const print = (obj, message) => {
    if (message) {
        console.log(message);
    }

    console.log(JSON.stringify(obj, null, 4));
}

export const stringify = obj => JSON.stringify(obj, null, 4);

// Takes a list and intersects and intersects it with another list. However, if the
// first list is empty, we return the second list.
// Can pass in a comparator for array of objects. The comparator will be called with the source
// array and an element from the target array and should return if the element is in the source array
export const intersectIfPopulated = (target, source, comparator) => {
    if (!target.length) {
        return source;
    }

    return target.filter(x => {
        if (comparator && typeof comparator === 'function') {
            return comparator(x, source);
        }

        return source.indexOf(x) !== -1;
    });
}

export const convertToObjectId = id => {
    if (typeof id === 'number' || typeof id === 'string') {
        return ObjectId(id);
    }

    return id;
}

// Returns a function to sort an array of objects by key
// Objects in the key must be strings or numbers (comparable using '<' and '>')
export const sortByKey = key => (a, b) => {
    if (a[key] > b[key]) {
        return 1;
    }

    if (a[key] < b[key]) {
        return -1;
    }

    return 0;
}

// Uses the createdAt property in each object
export const sortByDate = (a, b) => b.createdAt - a.createdAt;

// Return a redirect to the error page with an error key in the qs
export const redirectToError = (errorKey, res) => res.redirect(`/error?errorKey=${errorKey}`);

// Verifies that a request conatins a user and they are a member
export const isMember = req => req.user && req.user.isMember;

// Takes an array and returns all the unique values
export const unique = array => {
    let result = [];

    for (let i = 0; i < array.length; i++) {
        if(!result.includes(array[i])) {
            result.push(array[i]);
        }
    }

    return result;
};

// Retuns a regex for a plain language query that may contain multiple words using and logic
// NOTE: For compatability with mongodb, this function returns a string and not a RegExp object
export const getRegex = query => {
    let regex = '';
    const words = query.split(' ');

    if (words.length === 1) {
        // If there is only 1 word in the name query, use that
        regex = words[0];
    } else {
        // If there are multiple words in the name query, use and logic in the regex
        regex = words.reduce((r, word) => `${r}(?=.*${word})`, '');
    }

    return regex;
}
