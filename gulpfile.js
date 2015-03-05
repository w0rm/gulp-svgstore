var svgstore = require('./index')
var gulp = require('gulp')
var mocha = require('gulp-mocha')
var cheerio = require('gulp-cheerio')
var connect = require('connect')
var serveStatic = require('serve-static')
var http = require('http')
var inject = require('gulp-inject')


gulp.task('svg', function () {

  return gulp
    .src('test/src/*.svg')
    .pipe(cheerio({
      run: function ($) {
        $('[fill="none"]').removeAttr('fill')
      },
      parserOptions: { xmlMode: true }
    }))
    .pipe(svgstore())
    .pipe(gulp.dest('test/dest'))

})


gulp.task('inline-svg', function () {

  function fileContents (filePath, file) {
    return file.contents.toString('utf8')
  }

  var svgs = gulp
    .src('test/src/*.svg')
    .pipe(cheerio({
      run: function ($) {
        $('[fill="none"]').removeAttr('fill')
      },
      parserOptions: { xmlMode: true }
    }))
    .pipe(svgstore({ inlineSvg: true }))

  return gulp
    .src('test/src/inline-svg.html')
    .pipe(inject(svgs, { transform: fileContents }))
    .pipe(gulp.dest('test/dest'))

})



gulp.task('test', ['svg', 'inline-svg'], function () {

  var app = connect().use(serveStatic('test'))
  var server = http.createServer(app)

  server.listen(process.env.PORT || 8888)

  function serverClose () {
    server.close()
  }

  return gulp
    .src('test.js', { read: false })
    .pipe(mocha())
    .on('end', serverClose)

})
