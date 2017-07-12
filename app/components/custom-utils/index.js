export const required = param => {
    throw new Error(`${param} is required`);
}
