var cheerio = require('cheerio')
var path = require('path')
var through2 = require('through2')
var gutil = require('gulp-util')

module.exports = function (config) {

  config = config || {}

  var isEmpty = true
  var prefix = config.prefix || ''
  var fileName = config.fileName || 'svgstore.svg'
  var inlineSvg = config.inlineSvg || false
  var transformSvg = config.transformSvg || false

  var $ = cheerio.load(
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ' +
    '"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
    '<svg xmlns="http://www.w3.org/2000/svg" />', { xmlMode: true }
  )
  var $combinedSvg = $('svg')

  return through2.obj(

    function transform (file, encoding, cb) {

      if (file.isStream()) {
        return cb(new gutil.PluginError('gulp-svgstore', 'Streams are not supported!'))
      }

      var $svg = cheerio.load(file.contents.toString('utf8'), {xmlMode: true})('svg')
      var idAttr = prefix + path.basename(file.relative, path.extname(file.relative))
      var viewBoxAttr = $svg.attr('viewBox')
      var $symbol = $('<symbol/>')

      if (file && isEmpty) {
        isEmpty = false
      }

      $symbol.attr('id', idAttr)
      if (viewBoxAttr) {
        $symbol.attr('viewBox', viewBoxAttr)
      }

      $symbol.append($svg.contents())
      $combinedSvg.append($symbol)
      cb()
    }

  , function flush (cb) {
      var self = this

      function done (err, $svg) {
        var file
        var contents
        if (err) return cb(err)
        if ($svg) {
          $combinedSvg.replaceWith($svg)
        }
        contents = inlineSvg ? $.xml('svg') : $.xml()
        file = new gutil.File({ path: fileName, contents: new Buffer(contents) })
        self.push(file)
        cb()
      }

      if (isEmpty) return cb()

      if (transformSvg) {
        transformSvg($combinedSvg, done)
      } else {
        done()
      }

    }
  )
}
