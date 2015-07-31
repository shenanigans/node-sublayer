
var gulp = require('gulp');
var gutil = require('gulp-util');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var watchify = require('watchify');

var bundler;
function bundle(){
     var stream = bundler
      .bundle()
      .on('error', gutil.log.bind (gutil, 'Browserify Error'))
      .pipe (source('ControlPanel.js'))
      .pipe (gulp.dest('./static/'))
      ;
     stream.on ('end', function(){ gutil.log (gutil.colors.cyan ('built client library')); });
     return stream;
}

bundler = watchify (browserify({ cache: {}, packageCache: {} }));
bundler.require ('substation');
bundler.require ('./ControlPanel.js', { expose:'client' });
bundler.on ('update', bundle);

gulp.task ('bundle', bundle);
gulp.task ('default', [ 'bundle' ]);
