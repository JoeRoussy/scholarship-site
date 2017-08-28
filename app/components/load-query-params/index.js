export default (app) => {
    app.use((req, res, next) => {
        res.locals.queryParams = req.query;

        return next();
    });
}
