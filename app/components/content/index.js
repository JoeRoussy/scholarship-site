import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { ObjectID } from 'mongodb';
import config from '../../config';


export default app => {
    app.use((req, res, next) => {
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
}

function loadContent (options, callback) {
    const _options = {
        lang: 'en',
        page: '/',
        ...options
    }

    if (_options.page.indexOf('/') === 0) {
        _options.page = _options.page.substr(1);
    }

    // Make sure the query params are not involved in the loading of content
    _options.page = _options.page.split('?')[0];

    // Make sure any ids in the urls are replace with placeholders so the folder structures do not break
    const [ page, ...possibleParams ] = _options.page.split('/');
    const isHex = /[0-9A-F]+/;

    const innerParams = possibleParams.map(x => isHex.test(x) ? config.url.defualtParamEncoding : x);

    const autoloadPath = `${process.cwd()}/app/content/${_options.lang}/_autoload`;
    const contentPath = `${process.cwd()}/app/content/${_options.lang}${convertPageURL([ page, ...innerParams ].join('/'))}`;

    // First lets load the data in the autoload path. We do this first because if the request is for a bad url, we want to
    // be able to have our "not found" values in the render context
    handleFileRead(autoloadPath, (autoloadError, autoloadContent) => {
        if (autoloadError) {
            return callback(autoloadError);
        }

        // Now lets load the data in the actual path
        handleFileRead(contentPath, (contentError, content) => {
            if (contentError) {
                // There was not conent for this request (probably to a non-existant page) so
                // lets just return the autoload content so all the 404 handling works
                return callback(null, autoloadContent);
            }

            // We got autoload content and content for this page so lets merge them
            return callback(null, {
                ...autoloadContent,
                ...content
            });
        });
    });
};

function handleFileRead(path, callback) {
    execFile('find', [ path, '-type', 'f', '-maxdepth', '1' ], (err, files) => {
        if (err) {
            return callback(err);
        }

        // Treat files as an array in case this is the autoload
        const content = files
            .trim()
            .split('\n')
            .map(loadContentFile());

        const mergedContent = content.reduce((accumulator, current) => ({
            ...accumulator,
            ...current
        }), {});

        return callback(null, mergedContent);
    });  
}

function buildContentPath () {
    var _args = [].concat.apply([], arguments);
    _args.unshift('app/content');
    _args.unshift(process.cwd());

    return path.resolve.apply(null, _args);
}

function loadContentFile (options) {
    const _options = {
        addSlug: false,
        ...options
    }

    return function (file) {
        try {
            delete require.cache[file];

            var content = require(file);

            if (!_options.addSlug) {
                return content;
            }

            var stat = fs.statSync(file);

            if (stat.isDirectory()) {
                content.slug = '/' + path.basename(file).replace(/_/g, '-');
            }

            return content;
        } catch (e) {
            console.log(e);
        }
    }
}

function convertPageURL (url) {
    const u = url.split('?')[0];

    if (u === '') {
        return '/';
    }

    return `/${u}`;
}

function findNestedValue (obj, path) {
    var parts = path.split('.');

    if (parts.length==1){
        return obj[parts[0]];
    }

    return findNestedValue(obj[parts[0]], parts.slice(1).join('.'));
}
