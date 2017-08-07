export const required = (param, customMessage) => {
    if (typeof customMessage === 'string') {
        throw new Error(`could not find required param: ${param}. ${customMessage}`);
    } else {
        throw new Error(`${param} is required`);
    }
}

export class RuntimeError {
    constructor({ msg, err }) {
        this.msg = msg;
        this.err = err;
    }
}

export const print = obj => {
    console.log(JSON.stringify(obj, null, 4));
}
