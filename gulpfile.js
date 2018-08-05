const gulp = require('gulp');
const runSequence = require('run-sequence');
const util = require('gulp-util');
const es = require('event-stream');

const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');

const rename = require('gulp-rename');
const browserify = require('browserify');
const babelify = require('babelify');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const nodemon = require('gulp-nodemon');
const newer = require('gulp-newer');
const imagemin = require('gulp-imagemin');

const semanticWatch = require('./semantic/tasks/watch');
const semanticBuild = require('./semantic/tasks/build');

const frontEndScriptsGlob = './src/scripts/**/*.js';
const stylesGlob = './src/styles/**/*.scss';
const vendorStylesGlob = './src/styles/vendor/**/*.css';
const imagesGlob = './src/images/**/*';
const filesGlob = './src/files/**/*';
const appGlob = './app/**';
const serverPublicFolderPath = './public';

let isDev = true;

// Helper for the rename plugin. Doesn't affect the extensions on map files
function addMinToFileExtension(file) {
    if (file.extname != '.map') {
        file.extname = `.min${file.extname}`;
    }
}

gulp.task('scripts', () => {
    return gulp.src(frontEndScriptsGlob, (err, files) => {
        const tasks = files.map(function(entry) {
            return browserify({
                entries: [ entry ],
                debug: isDev
            })
                .transform(babelify, {
                    presets: [ 'es2015', 'stage-1' ],
                    compact: false
                })
                .bundle()
                .pipe(source(entry))
                .pipe(buffer())
                .pipe(isDev ? buffer() : uglify())
                .pipe(rename( function(fileObj){
                    if (fileObj.extname !== '.map') {
                        fileObj.extname = '.min.js';
                        fileObj.dirname = '';
                        fileObj.basename = fileObj.basename.replace('.bundle', '');
                    }
                }))
                .pipe(gulp.dest('./public/js/'));
            });
        es.merge(tasks);
    })
})

// Transfer styles to the server's public folder. Compile sass, minify for production.
gulp.task('styles', () => {
    const processors = [
        autoprefixer({
            browsers: [
                'last 2 version',
                'safari 5',
                'ie 9',
                'opera 12.1',
                'ios 6',
                'android 4'
            ]
        })
    ];

    if (!isDev) {
        processors.push(cssnano());
    }

    return gulp.src(stylesGlob)
        .pipe(sass())
        .pipe(postcss(processors))
        .pipe(concat('app.css'))
        .pipe(rename(file => addMinToFileExtension(file)))
        .pipe(gulp.dest(`${serverPublicFolderPath}/css`));
});

// Transfer vendor css files to the publix folder
gulp.task('vendorStyles', () => {
    const processors = [];

    if (!isDev) {
        processors.push(cssnano());
    }

    return gulp.src(vendorStylesGlob)
        .pipe(postcss(processors))
        .pipe(concat('vendor.css'))
        .pipe(rename(file => addMinToFileExtension(file)))
        .pipe(gulp.dest(`${serverPublicFolderPath}/css`));
});

// Image processing
gulp.task('image', function() {
    return gulp.src(imagesGlob)
        .pipe(newer('./public/images'))
        .pipe(imagemin({
            progressive: true,
            optimizationLevel: 7,
            interlaced: true
        }))
        .pipe(gulp.dest('./public/images'));
});

// Random file processing
gulp.task('file', function() {
    return gulp.src(filesGlob)
        .pipe(newer('./public/files'))
        .pipe(gulp.dest('./public'));
});

// Watch front end files and recomepile on any changes
gulp.task('watch', () => {
    gulp.watch(frontEndScriptsGlob, ['scripts']);
    gulp.watch(stylesGlob, ['styles']);
});

// Set up nodemon for watching back end files
gulp.task('nodemon', () => {
    nodemon({
        script: 'app/index.js',
        ext: 'js',
        execMap: {
            js: `node --inspect`
        },
        ignore: [
            'gulpfile.js',
            'public/*',
        ]
    });
});

gulp.task('semanticWatch', semanticWatch);

gulp.task('semanticBuild', semanticBuild);

// Build task for dev (is default)
gulp.task('default', () => {
    runSequence(['vendorStyles', 'styles', 'scripts', 'image', 'file', 'watch'], 'nodemon');
});

// Build task for production
gulp.task('production', () => {
    isDev = false;
    runSequence(['vendorStyles', 'styles', 'scripts', 'image', 'file', 'semanticBuild']);
});
