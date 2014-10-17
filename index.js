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

  var combinedDoc = cheerio.load(
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ' +
    '"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
    '<svg xmlns="http://www.w3.org/2000/svg" />', { xmlMode: true }
  )
  var combinedSvg = combinedDoc('svg')

  return through2.obj(

    function transform (file, encoding, cb) {

      if (file.isStream()) {
        return cb(new gutil.PluginError('gulp-svgstore', 'Streams are not supported!'))
      }

      var xmlDoc = cheerio.load(file.contents.toString('utf8'), {xmlMode: true})
      var idAttr = prefix + path.basename(file.relative, path.extname(file.relative))
      var viewBoxAttr = xmlDoc('svg').attr('viewBox')
      var symbol = cheerio('<symbol/>')

      if (file && isEmpty) {
        isEmpty = false
      }

      symbol.attr({ id: idAttr })
      if (viewBoxAttr) {
        symbol.attr({ viewBox: viewBoxAttr })
      }

      symbol.html(xmlDoc('svg').html())
      combinedSvg.append(symbol)
      cb()
    }

  , function flush (cb) {
      var self = this

      function done (err) {
        var file
        var contents
        if (err) return cb(err)
        contents = inlineSvg ? combinedSvg : combinedDoc
        file = new gutil.File({ path: fileName, contents: new Buffer(contents.html()) })
        self.push(file)
        cb()
      }

      if (isEmpty) return cb()

      if (transformSvg) {
        transformSvg(combinedSvg, done)
      } else {
        done (null, combinedSvg)
      }

    }
  )
}
