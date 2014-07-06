var svgstore = require('./index')
var gulp = require('gulp')
var svgmin = require('gulp-svgmin')

gulp.task('default', function () {

  return gulp.src('test/fixtures/*.svg')
             .pipe(svgmin())
             .pipe(svgstore({ fileName: 'icons.svg'
                            , prefix: 'icon-'
                            , inlineSvg: false
                            , emptyFills: true
                            }))
             .pipe(gulp.dest('test/'))

})
