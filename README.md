gulp-svgstore
=============

Combine svg files into one with defs


## Usage

The following script will combine circle.svg and square.svg into single svg file with defs.

```
var svgstore = require('./index')
var gulp = require('gulp')
var svgmin = require('gulp-svgmin')

gulp.task('default', function () {

  return gulp.src('test/fixtures/*.svg')
             .pipe(svgmin())
             .pipe(svgstore({fileName: 'icons.svg', prefix: 'icon-'}))
             .pipe(gulp.dest('test/'))

})
```



```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg>
  <defs>
    <g id="icon-circle">
      <circle xmlns="http://www.w3.org/2000/svg" fill="#fff" stroke="#1D1D1B" stroke-miterlimit="10" cx="20" cy="20" r="10"/>
    </g>
    <g id="icon-square">
      <path xmlns="http://www.w3.org/2000/svg" fill="#fff" stroke="#1D1D1B" stroke-miterlimit="10" d="M10 10h20v20h-20z"/>
    </g>
  </defs>
</svg>
```

