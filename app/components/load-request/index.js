import { print } from '../custom-utils';

export default (app) => {
    app.use((req, res, next) => {
        res.locals.queryParams = req.query;
        res.locals.host = req.headers.host;

        return next();
    });
}
