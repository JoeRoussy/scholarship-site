// Inspects the caslConfirmation flag on the user. If it is null or undefined, sets a flag to ask
// the user for casl consent.

const func = (req, res, next) => {
    if (!req.user) {
        return next();
    }

    if (req.user.caslConfirmation == null) {
        // Catches null and undefined
        res.locals.checkCasl = true;
    }

    return next();
};

export default func;