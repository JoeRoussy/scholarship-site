
const extend     = require('extend');
const execFile   = require('child_process').execFile;
const fs         = require('fs');
const path       = require('path');


exports.load = function (options, callback) {
    const _options = extend({
        lang: 'en',
        page: '/'
    }, options);

    if (_options.page.indexOf('/') === 0) {
        _options.page = _options.page.substr(1);
    }

    var autoloadPath = buildContentPath(
        _options.lang,
        '_autoload'
    );

    var contentPath = buildContentPath(
        _options.lang,
        convertPageURL(_options.page)
    );

    execFile('find', [ autoloadPath, contentPath, '-type', 'f', '-maxdepth', '1' ], function (err, files) {
        if (err) {
            return callback(err);
        }

        var content = files
            .trim()
            .split('\n')
            .map(loadContentFile());

        // This value tells extend to do a deep copy, allowing overwriting
        // of parent properties
        content.unshift(true);

        return callback(null, extend.apply(null, content));
    });
};

exports.getContentCollection = function (options, callback) {
    var _options = extend({
        lang: 'en',
        page: '/',
        limit: 1,
        offset: 0,
        filter: {
            dir: 'desc',
            attr: 'date'
        }
    }, options);

    if (_options.page.indexOf('/') === 0) {
        _options.page = _options.page.substr(1);
    }

    var contentPath = buildContentPath(
        _options.lang,
        convertPageURL(_options.page)
    );

    return findContentFiles({ path: contentPath }, (err, content, total) => {
        if (err) {
            return callback(err);
        }

        const pages = content
            .sort(sortByAttr(_options.filter.attr, _options.filter.dir))
            .slice(_options.offset, (_options.offset + _options.limit));

        return callback(null, pages, total);
    });
};

function findContentFiles (options, callback) {
    const {
        path,
        type = 'd'
    } = options;

    const args = {
        type,
        mindepth: 1,
        maxdepth: 1
    };

    const findArgs = [ path ].concat(convertObjectToArgs(args));

    return execFile('find', findArgs, (err, files) => {
        if (err) {
            return callback(err);
        }

        const fileList = files
            .trim()
            .split('\n');

        const content = fileList
            .map(loadContentFile({
                addSlug: true
            }));

        return callback(null, content, fileList.length);
    });
}

function convertObjectToArgs (obj) {
    return Object.keys(obj)
        .reduce((arr, key) => {
            arr.push(`-${key}`);
            arr.push(obj[key]);

            return arr;
        }, []);
}

function buildContentPath () {
    var _args = [].concat.apply([], arguments);
    _args.unshift('app/content');
    _args.unshift(process.cwd());

    return path.resolve.apply(null, _args);
}

function loadContentFile (options) {
    var _options = extend({
        addSlug: false
    }, options);

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
    var u = url.split('?')[0];

    return u.replace(/-/g, '_');
}

function sortByAttr (attr, dir) {
    return function (a, b) {
        var aVal = findNestedValue(a, attr),
            bVal = findNestedValue(b, attr);

        if (dir === 'asc') {
            return aVal.localeCompare(bVal);
        }

        return bVal.localeCompare(aVal);
    }
}

function findNestedValue (obj, path) {
    var parts = path.split('.');

    if (parts.length==1){
        return obj[parts[0]];
    }

    return findNestedValue(obj[parts[0]], parts.slice(1).join('.'));
}
