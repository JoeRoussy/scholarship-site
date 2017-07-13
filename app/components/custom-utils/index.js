export const required = param => {
    throw new Error(`${param} is required`);
}

export class RuntimeError {
    constructor({ msg, err }) {
        this.msg = msg;
        this.err = err;
    }
}
