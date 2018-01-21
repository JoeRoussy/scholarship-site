// Provides middleware to load certain keys in the querystring into the session

export const middleware = keys => (req, res, next) => {
    const {
        session,
        query
    } = req;

    if (!session) {
        throw new Error('Could not find session object in the request');
    }

    if (!query) {
        throw new Error('Could not find query object in the request');
    }

    if (!keys.length) {
        throw new Error('Must pass an array of keys to load from query string');
    }

    Object.keys(query).forEach(key => {
        if (keys.includes(key)) {
            session[key] = query[key];
        }
    });

    return next();
}

export const free = (session, key) => {
    delete session[key];
}
