var cheerio = require('cheerio')
var path = require('path')
var through2 = require('through2')
var gutil = require('gulp-util')

module.exports = function (config) {

  config = config || {}

  var isEmpty = true
  var fileName
  var inlineSvg = config.inlineSvg || false
  var ids = {}

  var resultSvg = '<svg xmlns="http://www.w3.org/2000/svg" />'
  if (!inlineSvg) {
    resultSvg =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ' +
      '"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
      resultSvg
  }

  var $ = cheerio.load(resultSvg, { xmlMode: true })
  var $combinedSvg = $('svg')

  return through2.obj(

    function transform (file, encoding, cb) {

      if (file.isStream()) {
        return cb(new gutil.PluginError('gulp-svgstore', 'Streams are not supported!'))
      }

      if (!file.cheerio) {
        file.cheerio = cheerio.load(file.contents.toString(), { xmlMode: true })
      }

      var $svg = file.cheerio('svg')
      var idAttr = path.basename(file.relative, path.extname(file.relative))
      var viewBoxAttr = $svg.attr('viewBox')
      var $symbol = $('<symbol/>')

      if (idAttr in ids) {
        return cb(new gutil.PluginError('gulp-svgstore', 'File name should be unique: ' + idAttr))
      }

      ids[idAttr] = true

      if (!fileName) {
        fileName = path.basename(file.base)
        if (fileName === '.' || !fileName) {
          fileName = 'svgstore.svg'
        } else {
          fileName = fileName.split(path.sep).shift() + '.svg'
        }
      }

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
      if (isEmpty) return cb()
      var file = new gutil.File({ path: fileName, contents: new Buffer($.xml()) })
      file.cheerio = $
      this.push(file)
      cb()
    }
  )
}
