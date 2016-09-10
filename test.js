/* global describe, it, before, after, beforeEach, afterEach */

var username = process.env.SAUCE_USERNAME || 'SAUCE_USERNAME'
var accessKey = process.env.SAUCE_ACCESS_KEY || 'SAUCE_ACCESS_KEY'
var tunnelIdentifier = process.env.TRAVIS_JOB_NUMBER
var port = process.env.PORT || 8888
var wd = require('wd')
var assert = require('assert')
var Q = wd.Q
var svgstore = require('./index')
var gutil = require('gulp-util')
var cheerio = require('cheerio')
var sinon = require('sinon')
var finalhandler = require('finalhandler')
var serveStatic = require('serve-static')
var http = require('http')
var sandbox = sinon.sandbox.create()


describe('gulp-svgstore usage test', function () {

  this.timeout(10 * 1000)

  var browser
  var serve = serveStatic('test')
  var server = http.createServer(function(req, res){
    var done = finalhandler(req, res)
    serve(req, res, done)
  })

  before(function () {
    this.timeout(5 * 60 * 1000)
    browser = wd.promiseChainRemote('ondemand.saucelabs.com', 80, username, accessKey)
    return Q.all([
      browser.init({
        browserName: 'chrome'
      , 'idle-timeout': 30 * 1000
      , 'tunnel-identifier': tunnelIdentifier
      }),
      Q.Promise(function (resolve) {
        server.listen(process.env.PORT || 8888, function () {
          resolve()
        })
      })
    ])
  })

  after(function () {
    this.timeout(5 * 60 * 1000)
    return Q.all([
      browser.quit().then(function(){}),
      Q.Promise(function (resolve) {
        server.close()
        server.unref()
        resolve()
      })
    ])
  })

  it('stored image should equal original svg', function () {
    var screenshot1
    return browser
      .get('http://localhost:' + port + '/inline-svg.html')
      .title()
      .then(function (title) {
        assert.equal(title, 'gulp-svgstore', 'Test page is not loaded')
      })
      .takeScreenshot()
      .then(function (data) {
        screenshot1 = data
      })
      .get('http://localhost:' + port + '/dest/inline-svg.html')
      .takeScreenshot()
      .then(function (screenshot2) {
        assert(screenshot1.toString() === screenshot2.toString(), 'Screenshots are different')
      })
  })

})


describe('gulp-svgstore unit test', function () {

  beforeEach(function () {
    sandbox.stub(gutil, 'log')
  })

  afterEach(function () {
    sandbox.restore()
  })

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

  it('should not include null or invalid files', function (done) {

    var stream = svgstore({ inlineSvg: true })

    stream.on('data', function (file) {
      var result = file.contents.toString()
      var target =
      '<svg xmlns="http://www.w3.org/2000/svg">' +
      '<symbol id="circle" viewBox="0 0 4 4"><circle cx="2" cy="2" r="1"/></symbol>' +
      '</svg>'
      assert.equal( result, target )
      done()
    })

    stream.write(new gutil.File({
      contents: new Buffer('<svg viewBox="0 0 4 4"><circle cx="2" cy="2" r="1"/></svg>')
    , path: 'circle.svg'
    }))

    stream.write(new gutil.File({
      contents: null
    , path: 'square.svg'
    }))

    stream.write(new gutil.File({
      contents: new Buffer('not an svg')
    , path: 'square.svg'
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

  it('should include all namespace into final svg', function (done) {

      var stream = svgstore()

      stream.on('data', function (file) {
        var $resultSvg = cheerio.load(file.contents.toString(), { xmlMode: true })('svg')

        assert.equal($resultSvg.attr('xmlns'), 'http://www.w3.org/2000/svg')
        assert.equal($resultSvg.attr('xmlns:xlink'), 'http://www.w3.org/1999/xlink')
        done()
      })

      stream.write(new gutil.File({
        contents: new Buffer(
          '<svg xmlns="http://www.w3.org/2000/svg">' +
            '<rect width="1" height="1"/>' +
          '</svg>')
      , path: 'rect.svg'
      }))

      stream.write(new gutil.File({
        contents: new Buffer(
          '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"' +
              'viewBox="0 0 50 50">' +
            '<rect id="a" width="50" height="10"/>' +
            '<use y="20" xlink:href="#a"/>' +
            '<use y="40" xlink:href="#a"/>' +
          '</svg>')
      , path: 'sandwich.svg'
      }))

      stream.end()

  })

  it('should not include duplicate namespaces into final svg', function (done) {

      var stream = svgstore({ inlineSvg: true })

      stream.on('data', function (file) {
        assert.equal(
          '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
          '<symbol id="rect"/><symbol id="sandwich"/></svg>',
          file.contents.toString()
        )
        done()
      })

      stream.write(new gutil.File({
        contents: new Buffer(
          '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"/>'
        )
      , path: 'rect.svg'
      }))

      stream.write(new gutil.File({
        contents: new Buffer(
          '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"/>'
        )
      , path: 'sandwich.svg'
      }))

      stream.end()

  })

  it('Warn about duplicate namespace value under different name', function (done) {

      var stream = svgstore()

      stream.on('data', function () {
        assert.equal(
          gutil.colors.yellow(
            'Same namespace value under different names : xmlns:lk and xmlns:xlink.\n' +
            'Keeping both.'
          ),
          gutil.log.getCall(0).args[0]
        )
        done()
      })

      stream.write(new gutil.File({
        contents: new Buffer(
          '<svg xmlns="http://www.w3.org/2000/svg" xmlns:lk="http://www.w3.org/1999/xlink">' +
            '<rect id="a" width="1" height="1"/>' +
            '<use y="2" lk:href="#a"/>' +
          '</svg>')
      , path: 'rect.svg'
      }))

      stream.write(new gutil.File({
        contents: new Buffer(
          '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"' +
              'viewBox="0 0 50 50">' +
            '<rect id="a" width="50" height="10"/>' +
            '<use y="20" xlink:href="#a"/>' +
            '<use y="40" xlink:href="#a"/>' +
          '</svg>')
      , path: 'sandwich.svg'
      }))

      stream.end()

  })

  it('Strong warn about duplicate namespace name with different value', function (done) {

      var stream = svgstore()

      stream.on('data', function () {
        assert.equal(
          gutil.colors.red(
            'xmlns:xlink namespace appeared multiple times with different value. ' +
            'Keeping the first one : "http://www.w3.org/1998/xlink".\n' +
            'Each namespace must be unique across files.'
          ),
          gutil.log.getCall(0).args[0]
        )
        done()
      })

      stream.write(new gutil.File({
        contents: new Buffer(
          '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1998/xlink">' +
            '<rect id="a" width="1" height="1"/>' +
            '<use y="2" xlink:href="#a"/>' +
          '</svg>')
      , path: 'rect.svg'
      }))

      stream.write(new gutil.File({
        contents: new Buffer(
          '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"' +
              'viewBox="0 0 50 50">' +
            '<rect id="a" width="50" height="10"/>' +
            '<use y="20" xlink:href="#a"/>' +
            '<use y="40" xlink:href="#a"/>' +
          '</svg>')
      , path: 'sandwich.svg'
      }))

      stream.end()
  })

})
