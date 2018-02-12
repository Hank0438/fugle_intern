var gulp = require('gulp');
    connect = require('gulp-connect'); 
    server = require('gulp-express');

gulp.task('default',function(){
    server.run(['bin/www']);
    console.log("gulp start!!");
    gulp.watch(['routes/*.js'],server.notify);
    gulp.watch(['views/*.ejs'],server.notify);
    gulp.watch(['model/*.js'],server.notify);
    gulp.watch(['public/javascripts/*.js'],server.notify);
    gulp.watch(['ptt-crawler_promise.js'],server.notify);
    gulp.watch(['crawler_mgr.js'],server.notify);
    gulp.watch(['public/javascripts/plugins/flot/*.js'],server.notify);
    gulp.watch(['public/javascripts/plugins/morris/*.js'],server.notify);
});

