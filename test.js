/* global describe, it, before, after */

var username = process.env.SAUCE_USERNAME || 'SAUCE_USERNAME'
var accessKey = process.env.SAUCE_ACCESS_KEY || 'SAUCE_ACCESS_KEY'
var tunnelIdentifier = process.env.TRAVIS_JOB_NUMBER
var port = process.env.PORT || 8888
var wd = require('wd')
var assert = require('assert')
var Q = wd.Q
var fs = require('fs')
var gm = require('gm')
var tmp = require('tmp')
var svgstore = require('./index')
var gutil = require('gulp-util')
var cheerio = require('cheerio')

tmp.setGracefulCleanup()


function writeScreenshot (data) {
  return Q.Promise(function (resolve, reject) {
    tmp.tmpName(function (err, path) {
      if (err) reject(new Error(err))
      fs.writeFile(path, data, 'base64', function (err) {
        if (err) reject(new Error(err))
        resolve(path)
      })
    })
  })
}


function compareScreenshots (path1, path2) {
  return Q.Promise(function (resolve, reject) {
    gm.compare(path1, path2, function (err, isEqual, equality, raw) {
      if (err) reject(new Error(err))
      resolve(isEqual, equality, raw)
    })
  })
}


describe('gulp-svgstore usage test', function () {

  this.timeout(10000)

  var browser

  before(function (done) {
    browser = wd.promiseChainRemote('ondemand.saucelabs.com', 80, username, accessKey)
    browser
      .init({
        browserName: 'chrome'
      , 'tunnel-identifier': tunnelIdentifier
      })
      .nodeify(done)
  })

  after(function (done) {
    browser.quit().nodeify(done)
  })

  it('stored image should equal original svg', function (done) {
    var screenshot1, screenshot2
    browser
      .get('http://localhost:' + port + '/inline-svg.html')
      .title()
      .then(function (title) {
        assert.equal(title, 'gulp-svgstore', 'Test page is not loaded')
      })
      .takeScreenshot()
      .then(writeScreenshot)
      .then(function (path) {
        screenshot1 = path
      })
      .get('http://localhost:' + port + '/dest/inline-svg.html')
      .takeScreenshot()
      .then(writeScreenshot)
      .then(function (path) {
        screenshot2 = path
      })
      .then(function () {
        return compareScreenshots(screenshot1, screenshot2)
      })
      .then(function (isEqual, equality, raw) { // jshint ignore:line
        assert.ok(isEqual, 'Screenshots are different')
      })
      .nodeify(done)
  })

})


describe('gulp-svgstore unit test', function () {

  it('should not create empty svg file', function (done) {

    var stream = svgstore()
    var isEmpty = true

    stream.on('data', function () {
      isEmpty = false
    })

    stream.on('end', function () {
      assert.ok(isEmpty, 'Created empty svg')
      done()
    })

    stream.end()

  })

  it('should correctly merge svg files', function (done) {

    var stream = svgstore({ inlineSvg: true })

    stream.on('data', function (file) {
      var result = file.contents.toString()
      var target =
      '<svg xmlns="http://www.w3.org/2000/svg">' +
      '<symbol id="circle" viewBox="0 0 4 4"><circle cx="2" cy="2" r="1"/></symbol>' +
      '<symbol id="square"><rect x="1" y="1" width="2" height="2"/></symbol>' +
      '</svg>'
      assert.equal( result, target )
      done()
    })

    stream.write(new gutil.File({
      contents: new Buffer('<svg viewBox="0 0 4 4"><circle cx="2" cy="2" r="1"/></svg>')
    , path: 'circle.svg'
    }))

    stream.write(new gutil.File({
      contents: new Buffer('<svg><rect x="1" y="1" width="2" height="2"/></svg>')
    , path: 'square.svg'
    }))

    stream.end()

  })

  it('should use cached cheerio object instead of file contents', function (done) {

    var stream = svgstore({ inlineSvg: true })
    var file = new gutil.File({
      contents: new Buffer('<svg><rect x="1" y="1" width="2" height="2"/></svg>')
    , path: 'square.svg'
    })

    file.cheerio = cheerio.load('<svg><circle cx="2" cy="2" r="1"/></svg>', { xmlMode: true })

    stream.on('data', function (file) {
      var result = file.contents.toString()
      var target =
      '<svg xmlns="http://www.w3.org/2000/svg">' +
      '<symbol id="square"><circle cx="2" cy="2" r="1"/></symbol>' +
      '</svg>'
      assert.equal( result, target )
      done()
    })

    stream.write(file)
    stream.end()

  })

  it('should cache cheerio object for the result file', function (done) {

    var stream = svgstore()

    stream.on('data', function (file) {
      assert.ok(file.cheerio)
      assert.equal( file.contents.toString(), file.cheerio.xml() )
      done()
    })

    stream.write(new gutil.File({
      contents: new Buffer('<svg viewBox="0 0 4 4"><circle cx="2" cy="2" r="1"/></svg>')
    , path: 'circle.svg'
    }))

    stream.end()

  })

  it('should merge defs to parent svg file', function (done) {

    var stream = svgstore({ inlineSvg: true })

    stream.on('data', function(file){
      var result = file.contents.toString()
      var target =
        '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<defs><circle id="circ" cx="2" cy="2" r="1"/></defs>' +
        '<symbol id="circle" viewBox="0 0 4 4"/>' +
        '</svg>'
      assert.equal( result, target )
      done()
    })

    stream.write(new gutil.File({
      contents: new Buffer(
        '<svg viewBox="0 0 4 4">' +
        '<defs><circle id="circ" cx="2" cy="2" r="1"/></svg></defs>' +
        '<circle cx="2" cy="2" r="1"/>' +
        '</svg>'
      )
    , path: 'circle.svg'
    }))

    stream.end()

  })

  it('should emit error if files have the same name', function (done) {

      var stream = svgstore()

      stream.on('error', function (error) {
        assert.ok(error instanceof gutil.PluginError)
        assert.equal(error.message, 'File name should be unique: circle')
        done()
      })

      stream.write(new gutil.File({ contents: new Buffer('<svg></svg>'), path: 'circle.svg' }))
      stream.write(new gutil.File({ contents: new Buffer('<svg></svg>'), path: 'circle.svg' }))

      stream.end()

  })

  it('should generate result filename based on base path of the first file', function (done) {

      var stream = svgstore()

      stream.on('data', function (file) {
        assert.equal(file.relative, 'icons.svg')
        done()
      })

      stream.write(new gutil.File({
        contents: new Buffer('<svg/>')
      , path: 'src/icons/circle.svg'
      , base: 'src/icons'
      }))

      stream.write(new gutil.File({
        contents: new Buffer('<svg/>')
      , path: 'src2/icons2/square.svg'
      , base: 'src2/icons2'
      }))

      stream.end()

  })

  it('should generate svgstore.svg if base path of the 1st file is dot', function (done) {

      var stream = svgstore()

      stream.on('data', function (file) {
        assert.equal(file.relative, 'svgstore.svg')
        done()
      })

      stream.write(new gutil.File({
        contents: new Buffer('<svg/>')
      , path: 'circle.svg'
      , base: '.'
      }))

      stream.write(new gutil.File({
        contents: new Buffer('<svg/>')
      , path: 'src2/icons2/square.svg'
      , base: 'src2'
      }))

      stream.end()

  })

})
