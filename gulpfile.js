'use strict';

var gulp        = require ('gulp');
var $           = require ('gulp-load-plugins')();
var webserver   = require ('gulp-webserver');
var merge       = require ('merge-stream');
var del         = require ('del');
var YAML = require('yamljs');
var critical = require('critical').stream;

var paths = {
    yaml   : './lang/**/*.yaml',
    html   : './templates/**/*.html',
    koliseo : ['./js/koliseo-agenda.js', './js/koliseo-polyfill.js'],
    fonts  : [
        './font-awesome/fonts/*.*',
        './bootstrap/fonts/*.*'
    ],
    css    : [
        './bootstrap/css/bootstrap.min.css',
        './font-awesome/css/font-awesome.min.css',
        'css/flexslider.css',
        'css/owl.carousel.css',
        'css/style.css',
        'css/kagenda-styles.css',
        'css/custom.css',
        'css/codigo-page.css',
        'css/posts-page.css',
    ],
    code    : [
        'css/custom.css',
        'css/codigo-page.css',
        'css/posts-page.css',
    ],
    js     : [
        './js/lazy-load-image.js',
        './js/jquery.min.js',
        './bootstrap/./js/bootstrap.min.js',
        './js/jquery.backstretch.min.js',
        './js/owl.carousel.min.js',
        './js/custom.js'
    ],
    images : './img/**/*',
    dist   : './dist/'
};

var isProd = false;


gulp.task('clean', () => {
    return del ([
        './dist/**',
    ]);
});

gulp.task('images', () => {
    return gulp.src (paths.images)
        .pipe($.if(isProd, $.imagemin ([
            $.imagemin.jpegtran({progressive: true}),
            $.imagemin.optipng({optimizationLevel: 7})            
        ])))
        .pipe (gulp.dest (paths.dist + '/img/'));
});

gulp.task('ico', () => {
    return gulp.src (['favicon.png', 'favicon.ico'])
        .pipe (gulp.dest (paths.dist));
});

gulp.task('js', () => {
    return gulp.src (paths.js)
        .pipe ($.concat ('main.js',{newLine: ';'}))
        .pipe($.if(isProd, $.uglify().on('error', function(err) {
            console.log(err.toString());
            this.emit('end');
        })))
        .pipe (gulp.dest (paths.dist + '/js/'));
});

gulp.task('koliseo', () => {
    return gulp.src (paths.koliseo)
        .pipe (gulp.dest (paths.dist + '/js/'));
});

gulp.task('css', () => {
    var page =  gulp.src (paths.css)
        .pipe ($.concat ('main.css'))
        .pipe($.if(isProd, $.cssmin()))
        .pipe (gulp.dest (paths.dist + '/css/'));

    var codePage = gulp.src (paths.code)
        .pipe ($.concat ('main-conduct.css'))
        .pipe($.if(isProd, $.cssmin()))
        .pipe (gulp.dest (paths.dist + '/css/'));

    return merge(page, codePage);
});

gulp.task('critical', () => {
  return gulp.src('dist/**/*.html')
        .pipe(critical({
            inline: true,
            base: 'dist/',
            minify: true,
            dimensions: [
            {
                height: 1050,
                width: 1980
            },                
            {
                height: 1024,
                width: 768
            }, {
                height: 1024,
                width: 980
            },
            {
                height: 736,
                width: 414
            }],            
            css: ['dist/css/main.css']
        }))
        .on('error', (err) => {
            console.error(err.message);
        })
        .pipe(gulp.dest('dist'));
});

gulp.task('fonts', () => {
    return gulp.src (paths.fonts)
        .pipe (gulp.dest(paths.dist + '/fonts'));
});

function html(lang) {
    var config = JSON.parse(JSON.stringify(require('./config.json')));
    var dist = paths.dist;
    var root = '/';
    var langFile;
    if (lang === 'es') {
        langFile = YAML.load('./lang/es/text.yaml');
        dist = dist + 'es';
        root = '/es/';
    } else {
        langFile = YAML.load('./lang/en/text.yaml');
    }

    config.text = langFile;
    config.lang = lang;   
    config.root = root;

    return gulp.src([
        'templates/pages/index.html',
        'templates/pages/*-' + lang +'.html'
    ])       
    .pipe($.nunjucksRender({
        path: ['templates/'],
        data: config
    }))  
    .pipe($.if(isProd, $.minifyHtml({
        quotes : true,
        empty  : true,
        spare  : true
    })))
    .pipe(gulp.dest(dist));
};

gulp.task('html-en', () => {
    return html('en');
});

gulp.task('html-es', () => {
    return html('es');
});

gulp.task('build', gulp.series('images', 'ico', 'fonts', 'koliseo', 'js', 'css', 'html-en', 'html-es'));

gulp.task('dist', gulp.series('clean', 'build'));

gulp.task('server', () => {
    gulp.src ('dist/')
        .pipe (webserver ({
            port             : 5000,
            livereload       : false,
            directoryListing : {
                enable : false,
            }
        }));
});

gulp.task('watch', () => {
    gulp.watch([paths.html, paths.yaml], gulp.series('html-en', 'html-es'));
    gulp.watch(paths.css, gulp.series('css'));
    gulp.watch(paths.js, gulp.series('js'));
    gulp.watch(paths.yaml, gulp.series('html-es', 'html-en'));
});


gulp.task('dev', () => {
    isProd = false;
    return gulp.parallel(gulp.series('clean', 'build', 'watch'), 'server')();
});

gulp.task('default', () => {
    isProd = true;
    return gulp.parallel('dist', 'server')();
});
