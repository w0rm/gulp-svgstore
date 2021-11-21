const cheerio = require('cheerio')
const path = require('path')
const Stream = require('stream')
const fancyLog = require('fancy-log')
const PluginError = require('plugin-error')
const Vinyl = require('vinyl')

const presentationAttributes = new Set([
  'style', 'alignment-baseline', 'baseline-shift', 'clip', 'clip-path',
  'clip-rule', 'color', 'color-interpolation', 'color-interpolation-filters',
  'color-profile', 'color-rendering', 'cursor', 'd', 'direction', 'display',
  'dominant-baseline', 'enable-background', 'fill', 'fill-opacity', 'fill-rule',
  'filter', 'flood-color', 'flood-opacity', 'font-family', 'font-size',
  'font-size-adjust', 'font-stretch', 'font-style', 'font-variant',
  'font-weight', 'glyph-orientation-horizontal', 'glyph-orientation-vertical',
  'image-rendering', 'kerning', 'letter-spacing', 'lighting-color',
  'marker-end', 'marker-mid', 'marker-start', 'mask', 'opacity', 'overflow',
  'pointer-events', 'shape-rendering', 'solid-color', 'solid-opacity',
  'stop-color', 'stop-opacity', 'stroke', 'stroke-dasharray',
  'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
  'stroke-opacity', 'stroke-width', 'text-anchor', 'text-decoration',
  'text-rendering', 'transform', 'unicode-bidi', 'vector-effect', 'visibility',
  'word-spacing', 'writing-mode'
]);

module.exports = function (config) {

  config = config || {}

  const namespaces = {}
  let isEmpty = true
  let fileName
  const inlineSvg = config.inlineSvg || false
  const ids = {}

  let resultSvg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs/></svg>'
  if (!inlineSvg) {
    resultSvg =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ' +
      '"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
      resultSvg
  }

  const $ = cheerio.load(resultSvg, { xmlMode: true })
  const $combinedSvg = $('svg')
  const $combinedDefs = $('defs')
  const stream = new Stream.Transform({ objectMode: true })

  stream._transform = function transform (file, _, cb) {

    if (file.isStream()) {
      return cb(new PluginError('gulp-svgstore', 'Streams are not supported!'))
    }

    if (file.isNull()) return cb()


    const $svg = cheerio.load(file.contents.toString(), { xmlMode: true })('svg')

    if ($svg.length === 0) return cb()

    const idAttr = path.basename(file.relative, path.extname(file.relative))
    const viewBoxAttr = $svg.attr('viewBox')
    const preserveAspectRatioAttr = $svg.attr('preserveAspectRatio')
    const $symbol = $('<symbol/>')

    if (idAttr in ids) {
      return cb(new PluginError('gulp-svgstore', 'File name should be unique: ' + idAttr))
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
    if (preserveAspectRatioAttr) {
      $symbol.attr('preserveAspectRatio', preserveAspectRatioAttr)
    }

    const attrs = $svg[0].attribs
    for (let attrName in attrs) {
      if (attrName.match(/xmlns:.+/)) {
        const storedNs = namespaces[attrName]
        const attrNs = attrs[attrName]

        if (storedNs !== undefined) {
          if (storedNs !== attrNs) {
            fancyLog.info(
              attrName + ' namespace appeared multiple times with different value.' +
              ' Keeping the first one : "' + storedNs +
              '".\nEach namespace must be unique across files.'
            )
          }
        } else {
          for (let nsName in namespaces) {
            if (namespaces[nsName] === attrNs) {
              fancyLog.info(
                'Same namespace value under different names : ' +
                  nsName +
                  ' and ' +
                  attrName +
                '.\nKeeping both.'
              )
            }
          }
          namespaces[attrName] = attrNs;
        }
      }
    }

    const $defs = $svg.find('defs')
    if ($defs.length > 0) {
      $combinedDefs.append($defs.contents())
      $defs.remove()
    }

    let $groupWrap = null
    for (let [name, value] of Object.entries($svg.attr())) {
      if (!presentationAttributes.has(name)) continue;
      if (!$groupWrap) $groupWrap = $('<g/>')
      $groupWrap.attr(name, value)
    }

    if ($groupWrap) {
      $groupWrap.append($svg.contents())
      $symbol.append($groupWrap)
    } else {
      $symbol.append($svg.contents())
    }
    $combinedSvg.append($symbol)
    cb()
  }

  stream._flush = function flush (cb) {
    if (isEmpty) return cb()
    if ($combinedDefs.contents().length === 0) {
      $combinedDefs.remove()
    }
    for (let nsName in namespaces) {
      $combinedSvg.attr(nsName, namespaces[nsName])
    }
    const file = new Vinyl({ path: fileName, contents: Buffer.from($.xml()) })
    this.push(file)
    cb()
  }

  return stream;
}
