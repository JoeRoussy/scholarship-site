import config from '../../config';


export default (app) => {
    app.use((req, res, next) => {
        res.locals.config = config;

        next();
    });
}
