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

export const print = obj => {
    console.log(JSON.stringify(obj, null, 4));
}

export const stringify = obj => JSON.stringify(obj, null, 4);

// Takes a list and intersects and intersects it with another list. However, if the
// first list is empty, we return the second list
export const intersectIfPopulated = (target, source) => {
    if (!target.length) {
        return source;
    }

    return target.filter(x => source.indexOf(x) !== -1);
}

export const convertToObjectId = id => {
    if (typeof id === 'number' || typeof id === 'string') {
        return ObjectId(id);
    }

    return id;
}
