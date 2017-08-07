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
        Error.captureStackTrace(this, RuntimeError); // This takes the ctor for this call out of the stack trace

        this.msg = msg;
        this.err = err;
    }
}

export const print = obj => {
    console.log(JSON.stringify(obj, null, 4));
}

export const stringify = obj => JSON.stringify(obj, null, 4);
