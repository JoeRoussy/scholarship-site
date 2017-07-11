import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';


export default (options, callback) => {
    const _options = {
        lang: 'en',
        page: '/',
        ...options
    }

    if (_options.page.indexOf('/') === 0) {
        _options.page = _options.page.substr(1);
    }

    const autoloadPath = `${process.cwd()}/app/content/${_options.lang}/_autoload`;
    const contentPath = `${process.cwd()}/app/content/${_options.lang}${convertPageURL(_options.page)}`;

    execFile('find', [ autoloadPath, contentPath, '-type', 'f', '-maxdepth', '1' ], (err, files) => {
        if (err) {
            return callback(err);
        }

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
};

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
