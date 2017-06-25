const gulp = require('gulp');
const runSequence = require('run-sequence');
const util = require('gulp-util');

const rename = require('gulp-rename');
const babel = require('gulp-babel');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const nodemon = require('gulp-nodemon');


const frontEndScriptsGlob = './src/scripts/*.js';
const stylesGlob = './src/styles/**/*.scss';
const appGlob = './app/**'
const serverPublicFolderPath = './public'

let isDev = true;


// Helper for the rename plugin. Doesn't affect the extensions on map files
function addMinToFileExtension(file) {
    if (file.extname != '.map') {
        file.extname = `.min${file.extname}`;
    }
}

// Concat and transpile all front end js files into bundle.js. Add sourcemaps in dev. Minify in production.
gulp.task('scripts', () => {
    return gulp.src(frontEndScriptsGlob)
        .pipe(isDev ? sourcemaps.init() : util.noop())
        .pipe(concat('bundle.js'))
        .pipe(babel( {presets: ['es2015']} ))
        .pipe(isDev ? util.noop() : uglify())
        .pipe(isDev ? sourcemaps.write('.') : util.noop())
        .pipe(rename(file => addMinToFileExtension(file)))
        .pipe(gulp.dest(`${serverPublicFolderPath}/js`));
});

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
        .pipe(concat('styles.css'))
        .pipe(rename(file => addMinToFileExtension(file)))
        .pipe(gulp.dest(`${serverPublicFolderPath}/css`));
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
        ignore: [
            'gulpfile.js',
            'public/*',
        ]
    });
});

// Build task for dev (is default)
gulp.task('default', () => {
    runSequence(['styles', 'scripts', 'watch'], 'nodemon');
});

// Build task for production
gulp.task('production', () => {
    isDev = false;
    runSequence(['styles', 'scripts']);
});
