import express from 'express';
import language from './components/language';
import loadContent from './components/content';
import templateConfig from './components/template-config';
import basicRouteConfig from './router/basicRoutes.js';
import searchRouteConfig from './router/searchRoutes.js';

const app = express();


app.use(express.static('public'));
app.use(language);

// TODO: This should be its own module
app.use((req, res, next) => {
    console.log('Value of req.url:');
    console.log(req.url);
    loadContent({
        lang: res.locals.selectedUserLanguage,
        page: req.url
    }, function (err, content) {
        const url = req.url.split('?');
        const slug = url[0];

        res.locals.page = {
            ...content,
            url: req.protocol + '://' + req.get('host') + req.url,
            slug,
            params: url[1] ? '?' + url[1] : ''
        };

        return next();
    });
});

templateConfig(app);
basicRouteConfig(app);
searchRouteConfig(app);


app.listen(3000, () => console.log('App is listening on port 3000'));
