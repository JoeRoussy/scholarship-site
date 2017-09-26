export default (app) => {
    app.use((req, res, next) => {
        res.locals.user = req.user;

        return next();
    });
}
