const extend = require('extend');


module.exports = (req, res, next) => {
    const segments = req.url
            .split('?')[0] // Strip query params
            .substr(1)     // Strip preceding slash
            .split('/');   // Separate segments

    const params = req.url.split('?')[1];

    // Check for language in URL. Default is en
    let lang = 'en';
    if ([ 'en', 'fr' ].indexOf(segments[0]) >= 0) {
        lang = segments.splice(0, 1).pop();
    }

    res.locals.selectedUserLanguage = lang;
    req.url = '/' + segments.join('/');

    if (params !== undefined) {
        req.url = req.url + '?' + params;
    }

    return next();
}
