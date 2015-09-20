var svgstore = require('./index')
var gulp = require('gulp')
var mocha = require('gulp-mocha')
var finalhandler = require('finalhandler')
var serveStatic = require('serve-static')
var http = require('http')
var inject = require('gulp-inject')


gulp.task('external', function () {

  return gulp
    .src('test/src/*.svg')
    .pipe(svgstore())
    .pipe(gulp.dest('test/dest'))

})


gulp.task('inline', function () {

  function fileContents (filePath, file) {
    return file.contents.toString('utf8')
  }

  var svgs = gulp
    .src('test/src/*.svg')
    .pipe(svgstore({ inlineSvg: true }))

  return gulp
    .src('test/src/inline-svg.html')
    .pipe(inject(svgs, { transform: fileContents }))
    .pipe(gulp.dest('test/dest'))

})


gulp.task('test', ['external', 'inline'], function () {

  var serve = serveStatic('test')
  var server = http.createServer(function(req, res){
    var done = finalhandler(req, res)
    serve(req, res, done)
  })

  server.listen(process.env.PORT || 8888)

  function serverClose () {
    server.close()
  }

  return gulp
    .src('test.js', { read: false })
    .pipe(mocha())
    .on('end', serverClose)

})
