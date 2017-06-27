require('babel-register')({
    ignore: function (filename) {
        if (filename.indexOf('/app/') === -1) {
            return true;
        }

        return false;
    },
    presets: [
        'es2015',
        'stage-1'
    ]
});


const express = require('express');
const extend = require('extend');
const language = require('./components/language');
const content = require('./components/content');
const templateConfig = require('./components/template-config');
const basicRouteConfig = require('./router/basicRoutes.js');
const searchRouteConfig = require('./router/searchRoutes.js');

const app = express();


app.use(express.static('public'))
app.use(language);

// TODO: This should be its own module
app.use((req, res, next) => {
    content.load({
        lang: res.locals.selectedUserLanguage,
        page: req.url
    }, function (err, content) {
        const url = req.url.split('?');
        const slug = url[0];

        res.locals.page = extend(content, {
            url: req.protocol + '://' + req.get('host') + req.url,
            slug,
            params: url[1] ? '?' + url[1] : ''
        });

        return next();
    });
});

templateConfig(app);
basicRouteConfig(app);
searchRouteConfig(app);


app.listen(3000, () => console.log('App is listening on port 3000'));
