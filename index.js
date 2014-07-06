var libxml = require('libxmljs')
var path = require('path')
var through2 = require('through2')
var gutil = require('gulp-util')

module.exports = function (config) {

  config = config || {}

  var prefix = config.prefix || ''
  var fileName = config.fileName || 'svg-defs.svg'
  var inlineSvg = config.inlineSvg || config.onlySvg || false
  var emptyFills = config.emptyFills || false

  var combinedDoc = new libxml.Document()
  var svg = combinedDoc.node('svg')
  svg.attr({ xmlns: 'http://www.w3.org/2000/svg' })

  combinedDoc.setDtd( 'svg'
                    , '-//W3C//DTD SVG 1.1//EN'
                    , 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'
                    )

  return through2.obj(

    function transform (file, encoding, cb) {

      var xmlDoc = libxml.parseXml(file.contents.toString('utf8'))
      var contents = xmlDoc.root().childNodes()
      var idAttr = prefix + path.basename(file.relative, path.extname(file.relative))
      var viewBoxAttr = xmlDoc.root().attr('viewBox').value()
      var symbol = libxml.Element(combinedDoc, 'symbol')

      symbol.attr({ id: idAttr, viewBox: viewBoxAttr })

      contents.forEach(function (child) {
        child.namespace(null)
        symbol.addChild(child)
      })

      svg.addChild(symbol)

      cb(null)
    }

  , function flush (cb) {

      if (emptyFills) {
        combinedDoc.find('//*[@fill="none"]').forEach(function (child) {
          child.attr('fill').remove()
        })
      }

      this.push(new gutil.File({
        path: fileName
      , contents: new Buffer(inlineSvg ? svg.toString() : combinedDoc.toString())
      }))

      cb(null)
    }
  )
}
