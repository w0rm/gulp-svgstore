gulp-svgstore
=============

Combine svg files into one with `<symbol>` elements.
Read more about this in [CSS Tricks article](http://css-tricks.com/svg-symbol-good-choice-icons/).

## Caution:

This is still incomplete and api may be changed anytime.
I plan to add tests and then freeze api.

## Options:

* fileName — the name of result file
* prefix — prefix for ids of the <symbol> elements
* inlineSvg — output only `<svg>` element without `<?xml ?>` and `DOCTYPE` to use inline
* emptyFills - remove all fill="none" so they can be changed in css

## Usage

The following script will combine circle.svg and square.svg into single svg file with
`<symbol>` elements.

```
var svgstore = require('gulp-svgstore')
var gulp = require('gulp')
var svgmin = require('gulp-svgmin')
gulp.task('default', function () {
  return gulp.src('test/fixtures/*.svg')
             .pipe(svgmin())
             .pipe(svgstore({ fileName: 'icons.svg'
                            , prefix: 'icon-'
                            , inlineSvg: false
                            }))
             .pipe(gulp.dest('test/'))
})
```

Combined svg:

```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg">
  <symbol id="icon-circle" viewBox="0 0 40 40">
    <circle fill="#fff" stroke="#1D1D1B" stroke-miterlimit="10" cx="20" cy="20" r="10"/>
  </symbol>
  <symbol id="icon-square" viewBox="0 0 40 40">
    <path stroke="#1D1D1B" stroke-miterlimit="10" d="M10 10h20v20h-20z"/>
  </symbol>
</svg>
```
