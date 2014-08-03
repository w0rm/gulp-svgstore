var svgstore = require('./index')
var gulp = require('gulp')
var mocha = require('gulp-mocha')
var connect = require('gulp-connect')
var inject = require('gulp-inject')


gulp.task('svg', function () {

  return gulp.src('test/src/*.svg')
             .pipe(svgstore({ fileName: 'icons.svg'
                            , prefix: 'icon-'
                            , inlineSvg: false
                            , emptyFills: true
                            }))
             .pipe(gulp.dest('test/dest/'))

})


gulp.task('inline-svg', function () {

  return gulp
    .src('test/src/inline-svg.html')
    .pipe(inject(
      gulp
        .src('test/src/*.svg')
        .pipe(svgstore({ fileName: 'icons.svg'
                       , prefix: 'icon-'
                       , inlineSvg: true
                       , emptyFills: true
                       }))
    , { transform: function (filePath, file) {
           return file.contents.toString('utf8')
         }
       }
    ))
    .pipe(gulp.dest('test/dest/'))

})



gulp.task('test', ['svg', 'inline-svg'], function () {

  connect.server({
    port: process.env.PORT || 8888
  , root: 'test'
  })

  return gulp
    .src('test.js', { read: false })
    .pipe(mocha())
    .on('end', function () { connect.serverClose() })
    .on('error', function () { connect.serverClose() })

})
