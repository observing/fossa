describe('Defer', function () {
  'use strict';

  var common = require('./common')
    , Defer = require('../lib/defer')
    , expect = common.expect
    , defer;

  beforeEach(function () {
    defer = new Defer;
  });

  afterEach(function () {
    defer = null;
  });

  it('exposes constructer', function () {
    expect(Defer).to.be.a('function');
    expect(defer).to.be.instanceof(Defer);
  });

  describe('#done', function () {
    it('stores the provided callback', function () {
      function noop() {}

      defer.done(noop);
      expect(defer.then).to.equal(noop);
    });

    it('calls the provided function immediatly if `stack` is available', function (done) {
      var test = defer.stack = [ null, 'custom arguments' ];

      defer.done(function (error, result) {
        expect(error).to.equal(test[0]);
        expect(result).to.equal(test[1]);
        done();
      });
    });
  });

  describe('#next', function () {
    it('stores provided arguments on `stack`', function () {
      defer.next('list', 'of', 'arguments');
      expect(defer.stack.length).to.equal(3);
      expect(defer.stack[0]).to.equal('list');
      expect(defer.stack[1]).to.equal('of');
      expect(defer.stack[2]).to.equal('arguments');
    });

    it('calls provided function on `then` if `stack` is available', function (done) {
      defer.then = function noop(first, second, third) {
        expect(first).to.equal('list');
        expect(second).to.equal('of');
        expect(third).to.equal('arguments');
        done();
      };

      defer.next('list', 'of', 'arguments');
    });
  });
});
