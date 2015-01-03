gulp-svgstore
=============

[![Build Status](https://api.travis-ci.org/w0rm/gulp-svgstore.png)](https://travis-ci.org/w0rm/gulp-svgstore)

Combine svg files into one with `<symbol>` elements.
Read more about this in [CSS Tricks article](http://css-tricks.com/svg-symbol-good-choice-icons/).

If you need similar plugin for grunt, I encourage you to check [grunt-svgstore](https://github.com/FWeinb/grunt-svgstore).

## Options:

* fileName — the name of result file, default: 'svgstore.svg'
* prefix — prefix for ids of the <symbol> elements, default: ''
* inlineSvg — output only `<svg>` element without `<?xml ?>` and `DOCTYPE` to use inline, default: false

## Usage

The following script will combine circle.svg and square.svg into single svg file with
`<symbol>` elements. Additionally pass through [gulp-svgmin](https://github.com/ben-eb/gulp-svgmin)
to minimize svg payload size.

```js
var gulp = require('gulp');
var svgstore = require('gulp-svgstore');
var svgmin = require('gulp-svgmin');

gulp.task('svgstore', function () {
    return gulp
        .src('test/src/*.svg')
        .pipe(svgmin())
        .pipe(svgstore({ fileName: 'icons.svg', prefix: 'icon-' }))
        .pipe(gulp.dest('test/dest'));
});
```

### Inlining svgstore result into html body

To inline combined svg into html body I suggest using [gulp-inject](https://github.com/klei/gulp-inject).
The following gulp task will inject svg into
`<!-- inject:svg --><!-- endinject -->` placeholder of test/src/inline-svg.html.

```js
var gulp = require('gulp');
var svgstore = require('gulp-svgstore');
var inject = require('gulp-inject');

gulp.task('svgstore', function () {
    var svgs = gulp
        .src('test/src/*.svg')
        .pipe(svgstore({ prefix: 'icon-', inlineSvg: true }));

    function fileContents (filePath, file) {
        return file.contents.toString();
    }

    return gulp
        .src('test/src/inline-svg.html')
        .pipe(inject(svgs, { transform: fileContents }))
        .pipe(gulp.dest('test/dest'));
});
```

### Using svg as external file

There is a problem with `<use xlink:href="external.svg#icon-name">` in Internet Explorer,
so you should either inline everything into body with a
[simple script like this](https://gist.github.com/w0rm/621a56a353f7b2a6b0db) or
polyfill with [svg4everybody](https://github.com/jonathantneal/svg4everybody).

## PNG sprite fallback for unsupported browsers

[gulp-svgfallback](https://github.com/w0rm/gulp-svgfallback) is a gulp plugin that generates png
sprite and css file with background offsets from svg sources. Please check it and leave feedback.

## Transform svg sources or combined svg

To transform either svg sources or combined svg you may pipe your files through
[gulp-cheerio](https://github.com/KenPowers/gulp-cheerio).

### Transform svg sources

An example below removes all fill attributes from svg sources before combining them.
Please note that you have to set `xmlMode: true` to parse svgs as xml file.

```js
var gulp = require('gulp');
var svgstore = require('gulp-svgstore');
var cheerio = require('gulp-cheerio');

gulp.task('svgstore', function () {
    return gulp
        .src('test/src/*.svg')
        .pipe(cheerio({
            run: function ($) {
                $('[fill]').removeAttr('fill');
            },
            parserOptions: { xmlMode: true }
        })
        .pipe(svgstore({ inlineSvg: true })
        .pipe(gulp.dest('test/dest'));
});
```

### Transform combined svg

The following example sets `style="display:none"` on the combined svg:

```js
var gulp = require('gulp');
var svgstore = require('gulp-svgstore');
var cheerio = require('gulp-cheerio');

gulp.task('svgstore', function () {
    return gulp
        .src('test/src/*.svg')
        .pipe(svgstore({ inlineSvg: true }))
        .pipe(cheerio(function ($) {
            $('svg').attr('style', 'display:none');
        }));
});
```

## Extracting metadata from combined svg

Since gulp-svgstore and gulp-cheerio plugins cache cheerio in gulp file object,
you may use it in your pipeline to extract metadata from svg sources or combined svg.
The following example extracts viewBox and id from each symbol in combined svg.

```js
var gulp = require('gulp');
var gutil = require('gulp-util');
var svgstore = require('gulp-svgstore');
var through2 = require('through2');

gulp.task('metadata', function () {
    return gulp
        .src('test/src/*.svg')
        .pipe(svgstore())
        .pipe(though2.obj(function (file, encoding, cb) {
            var $ = file.cheerio;
            var data = $('svg > symbol').map(function () {
                return {
                    name: $(this).attr('id'),
                    viewBox: $(this).attr('viewBox')
                };
            }).get();
            var jsonFile = new gutil.File({
                path: 'metadata.json',
                contents: new Buffer(JSON.stringify(data))
            });
            this.push(jsonFile);
            this.push(file);
            cb();
        }));
});
```

## Changelog

* 4.0.0
  * Removed `transformSvg`, pipe files through [gulp-cheerio](https://github.com/KenPowers/gulp-cheerio) instead.
  * Made cheerio 0.* a peer dependency, allows to choose what version to use.
  * Uses `file.cheerio` if cached in gulp file object and also sets it for the combined svg.
  * Improved readme.

* 3.0.0
  * Used cheerio instead of libxmljs (changes transformSvg syntax)

* 2.0.0
  * Added check for inputs before generating SVG.

* 1.0.1
  * Added check for missing viewBox in original svg.

* 1.0.0
  * Initial release.
