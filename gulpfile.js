
var gulp = require('gulp');
var gutil = require('gulp-util');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var watchify = require('watchify');

var ControlPanelBundler;
function bundleControlPanel(){
     var stream = ControlPanelBundler
      .bundle()
      .on('error', gutil.log.bind (gutil, 'Browserify Error'))
      .pipe (source('ControlPanel.js'))
      .pipe (gulp.dest('./static/'))
      ;
     stream.on ('end', function(){ gutil.log (gutil.colors.cyan ('built ControlPanel')); });
     return stream;
}

ControlPanelBundler = watchify (browserify({ cache: {}, packageCache: {} }));
ControlPanelBundler.require ('substation');
ControlPanelBundler.require ('./ControlPanel.js', { expose:'client' });
ControlPanelBundler.on ('update', bundleControlPanel);

var RootBundler;
function bundleRoot(){
     var stream = RootBundler
      .bundle()
      .on('error', gutil.log.bind (gutil, 'Browserify Error'))
      .pipe (source('Root.js'))
      .pipe (gulp.dest('./static/'))
      ;
     stream.on ('end', function(){ gutil.log (gutil.colors.cyan ('built Root')); });
     return stream;
}

RootBundler = watchify (browserify({ cache: {}, packageCache: {} }));
RootBundler.require ('substation');
RootBundler.require ('./Root.js', { expose:'client' });
RootBundler.on ('update', bundleRoot);

var NotificationBundler;
function bundleNotification(){
     var stream = NotificationBundler
      .bundle()
      .on('error', gutil.log.bind (gutil, 'Browserify Error'))
      .pipe (source('Notification.js'))
      .pipe (gulp.dest('./static/'))
      ;
     stream.on ('end', function(){ gutil.log (gutil.colors.cyan ('built Notification')); });
     return stream;
}

NotificationBundler = watchify (browserify({ cache: {}, packageCache: {} }));
NotificationBundler.require ('./Notification.js', { expose:'client' });
NotificationBundler.on ('update', bundleNotification);

var DomainBundler;
function bundleDomain(){
     var stream = DomainBundler
      .bundle()
      .on('error', gutil.log.bind (gutil, 'Browserify Error'))
      .pipe (source('Domain.js'))
      .pipe (gulp.dest('./static/'))
      ;
     stream.on ('end', function(){ gutil.log (gutil.colors.cyan ('built Domain')); });
     return stream;
}

DomainBundler = watchify (browserify({ cache: {}, packageCache: {} }));
DomainBundler.require ('./Domain.js', { expose:'client' });
DomainBundler.on ('update', bundleDomain);

gulp.task ('ControlPanel', bundleControlPanel);
gulp.task ('Notification', bundleNotification);
gulp.task ('Root', bundleRoot);
gulp.task ('Domain', bundleDomain);
gulp.task ('default', [ 'ControlPanel', 'Notification', 'Root', 'Domain' ]);
