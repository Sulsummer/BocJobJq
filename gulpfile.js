'use strict';

var gulp = require('gulp'),
    sass = require('gulp-sass'),
    del = require('del'),
    browserSync = require('browser-sync').create(),
    reload = browserSync.reload,
    runSequence = require('run-sequence'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    minifyCss = require('gulp-minify-css'),
    inject = require('gulp-inject');

//src
var src = {
    INCLUDE_STYLE: 'src/styles/',
    SCRIPTS: ['src/modules/*.js', 'src/modules/*/*.js'],
    STYLES: ['src/styles/*.scss', 'src/modules/*/*.scss']
}

//dev
var dev = {
    STYLES: 'src/styles/'
}



// dist
var dist = {

}


gulp.task('server', ['dev'], function(){
    browserSync.init({
        server: './'
    });

    gulp.watch(['src/*', 'src/*/*.*', 'src/*/*/*.*'], ['dev']).on('change', browserSync.reload);
    // gulp.watch(['app/*.*', 'app/*/*.*', 'app/*/*/*.*', 'app/*/*/*/*.*', '*.*']).on('change', browserSync.reload);
});

gulp.task('dev', function(){
    return gulp.src(src.STYLES)
            .pipe(sass({
                includePaths: src.INCLUDE_STYLE
            }))
            .pipe(concat('style.css'))
            .pipe(gulp.dest(dev.STYLES))
});

gulp.task('default', ['server']);