gulp-svgstore
=============

[![Build Status](https://api.travis-ci.org/w0rm/gulp-svgstore.png)](https://travis-ci.org/w0rm/gulp-svgstore)

Combine svg files into one with `<symbol>` elements.
Read more about this in [CSS Tricks article](http://css-tricks.com/svg-symbol-good-choice-icons/).

If you need similar plugin for grunt, I encourage you to check [grunt-svgstore](https://github.com/FWeinb/grunt-svgstore).

## Options:

The following options are set automatically based on file data:

* `id` attribute of the `<symbol>` element is set to the name of corresponding file;
* result filename is the name of base directory of the first file.

If your workflow is different, please use `gulp-rename` to rename sources or result.

The only available option is:

* inlineSvg — output only `<svg>` element without `<?xml ?>` and `DOCTYPE` to use inline, default: `false`.

## Usage

The following script will combine all svg sources into single svg file with `<symbol>` elements.
The name of result svg is the base directory name of the first file `src.svg`.

Additionally pass through [gulp-svgmin](https://github.com/ben-eb/gulp-svgmin)
to minimize svg payload size.

```js
var gulp = require('gulp');
var svgstore = require('gulp-svgstore');
var svgmin = require('gulp-svgmin');

gulp.task('svgstore', function () {
    return gulp
        .src('test/src/*.svg')
        .pipe(svgmin())
        .pipe(svgstore())
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
        .pipe(svgstore({ inlineSvg: true }));

    function fileContents (filePath, file) {
        return file.contents.toString();
    }

    return gulp
        .src('test/src/inline-svg.html')
        .pipe(inject(svgs, { transform: fileContents }))
        .pipe(gulp.dest('test/dest'));
});
```

### Generating id attributes

Id of symbol element is calculated from file name. You cannot pass files with the same name,
because id should be unique.

If you need to add prefix to each id, please use `gulp-rename`:

```js
var gulp = require('gulp');
var rename = require('gulp-rename');
var svgstore = require('gulp-svgstore');

gulp.task('default', function () {
    return gulp
        .src('src/svg/**/*.svg', { base: 'src/svg' })
        .pipe(rename({prefix: 'icon-'})
        .pipe(svgstore())
        .pipe(gulp.dest('dest'));
});
```

If you need to have nested directories that may have files with the same name, please
use `gulp-rename`. The following example will concatenate relative path with the name of the file,
e.g. `src/svg/one/two/three/circle.svg` becomes `one-two-three-circle`.


```js
var gulp = require('gulp');
var rename = require('gulp-rename');
var svgstore = require('gulp-svgstore');

gulp.task('default', function () {
    return gulp
        .src('src/svg/**/*.svg', { base: 'src/svg' })
        .pipe(rename(function (path) {
            var name = path.dirname.split(path.sep);
            name.push(path.basename);
            path.basename = name.join('-');
        }))
        .pipe(svgstore())
        .pipe(gulp.dest('dest'));
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
        }))
        .pipe(gulp.dest('test/dest'));
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
        }))
        .pipe(gulp.dest('test/dest'));
});
```

## Changelog

* 5.0.0
  * Removed prefix and fileName options

* 4.0.3
  * Ensure unique file names
  * Improved readme with gulp-rename usage to generate id for nested directories

* 4.0.1
  * Added cheerio to devDependencies

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
