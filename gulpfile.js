var svgstore = require('./index')
var gulp = require('gulp')
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

gulp.task('build', ['external', 'inline'])
