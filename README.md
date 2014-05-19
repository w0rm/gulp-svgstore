gulp-svgstore
=============

Combine svg files into one with defs. Read more about this in [CSS Tricks article](http://css-tricks.com/svg-sprites-use-better-icon-fonts/).

## Options:

* fileName — the name of result file
* prefix — prefix for ids of the defs child elements
* onlySvg — output only `<svg>` element without `<?xml ?>` and `DOCTYPE`


## Usage

The following script will combine circle.svg and square.svg into single svg file with defs.

```
var svgstore = require('gulp-svgstore')
var gulp = require('gulp')
var svgmin = require('gulp-svgmin')
gulp.task('default', function () {
  return gulp.src('test/fixtures/*.svg')
             .pipe(svgmin())
             .pipe(svgstore({fileName: 'icons.svg', prefix: 'icon-', onlySvg: false}))
             .pipe(gulp.dest('test/'))
})
```

```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg>
  <defs>
    <g id="icon-circle">
      <circle fill="#fff" stroke="#1D1D1B" stroke-miterlimit="10" cx="20" cy="20" r="10"/>
    </g>
    <g id="icon-square">
      <path fill="#fff" stroke="#1D1D1B" stroke-miterlimit="10" d="M10 10h20v20h-20z"/>
    </g>
  </defs>
</svg>
```
