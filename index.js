'use strict';

var libxml = require('libxmljs')
var path = require('path')
var through2 = require('through2')
var gutil = require('gulp-util')

module.exports = function (config) {

  config = config || {}

  var prefix = config.prefix || ''
  var fileName = config.fileName || 'svg-defs.svg'
  var onlySvg = config.onlySvg || false
  var combinedDoc = new libxml.Document()
  var svg = combinedDoc.node('svg')
  var defs = svg.node('defs')

  combinedDoc.setDtd('svg', '-//W3C//DTD SVG 1.1//EN', 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd')

  return through2.obj(

    function transform (file, encoding, cb) {

      var xmlDoc = libxml.parseXml(file.contents.toString('utf8'))
      var contents = xmlDoc.root().childNodes()
      var idAttr = prefix + path.basename(file.relative, path.extname(file.relative))
      var g = libxml.Element(combinedDoc, 'g').attr({id: idAttr})

      contents.forEach(function (child) {
        child.namespace(null)
        g.addChild(child)
      })

      defs.addChild(g)

      cb(null)
    }

  , function flush (cb) {

      this.push(new gutil.File({
        path: fileName
      , contents: new Buffer(onlySvg ? svg.toString() : combinedDoc.toString())
      }))

      cb(null)
    }
  )
}
