describe('Fossa', function () {
  'use strict';

  var common = require('./common')
    , mongo = require('mongodb')
    , expect = common.expect
    , Fossa = common.Fossa
    , db;

  //
  // Establish connection to db
  //
  before(function (done) {
    var db = new mongo.Db('fossa', new mongo.Server('localhost', 27017), {w:1});

    db.open(function(err, db) {
      db.createCollection('test', function(err, collection) {
        collection.insert([{a:1, b:1}, {c:1, d:1}], {w:1}, function () {
          db.createCollection('test1', function(err, collection) {
            collection.insert([{e:1, f:1}, {g:1, h:1}], {w:1}, done);
          });
        });
      });
    });
  });

  after(function (done) {
    var db = new mongo.Db('fossa', new mongo.Server('localhost', 27017), {w:1});
    db.open(function(err, db) {
      db.dropDatabase(done);
    });
  });

  beforeEach(function () {
    db = new Fossa;
  });

  afterEach(function () {
    db = null;
  });

  it('exposes constructor', function () {
    expect(Fossa).to.be.a('function');
  });

  it('exposes a helper to create a new instance with default settings', function () {
    expect(Fossa.create).to.be.a('function');

    var fossa = Fossa.create();
    expect(fossa).to.be.an.instanceof(Fossa);
    expect(fossa.plugins).to.be.an('object');
    expect(Object.keys(fossa.plugins).length).to.equal(0);
    expect(fossa.mongoclient).to.be.an('object');

    expect(fossa.Model.extend).to.be.a('function');
    expect(fossa.Collection.extend).to.be.a('function');
  });

  it('exposes reference to mongoDB driver', function () {
    expect(Fossa.mongo).to.be.a('function');
  });

  it('has queryable options with defaults', function () {
    expect(db.options).to.be.a('function');
    expect(db.options('host', 'localhost')).to.equal('localhost');
    expect(db.options('host')).to.equal(undefined);

    var fossa = new Fossa({ host: '127.0.0.1' });
    expect(fossa.options('host')).to.equal('127.0.0.1');
  });

  describe('#connect', function () {
    it('to mongoDB or returns opened connection from the pool', function (done) {
      expect(db.client).to.equal(undefined);
      db.connect('fossa', function () {
        expect(db.client).to.be.an('object');
        done();
      });
    });

    it('switches to the proper collection', function (done) {
      expect(db.client).to.equal(undefined);
      db.connect('fossa', 'test', function () {
        db.client.store.findOne({b:1}, function (err, item) {
          expect(err).to.equal(null);
          expect(item.b).to.equal(1);

          db.connect('fossa', 'test1', function (err, item) {
            db.client.store.findOne({f:1}, function (err, item) {
              expect(err).to.equal(null);
              expect(item.f).to.equal(1);
              done();
            });
          });
        });
      });
    });
  });

  describe('#use', function () {
    it('adds plugins to the interface', function (done) {
      db.use('pluggable', function pluggable(fossa, options) {
        expect(fossa).to.an.instanceof(Fossa);
        expect(db.plugins).to.have.property('pluggable');
        done();
      });
    });

    it('passes options to the plugin', function (done) {
      var db = new Fossa({ host: '127.0.0.1' });
      db.use('pluggable', function pluggable(fossa, options) {
        expect(options('host')).to.equal('127.0.0.1');
        done();
      });
    });

    it('throws an error when an invalid name is provided', function () {
      var plugin = function () {
        db.use({}, function pluggable(fossa, options) { });
      };

      expect(plugin).to.throw('Plugin names should be a string');
    });

    it('throws an error when the plugin is not a callable function', function () {
      var plugin = function () {
        db.use('pluggable', {});
      };

      expect(plugin).to.throw('Plugin should be a function');
    });
  });

  describe('#collection', function () {
    it('switches the current active collection on the client', function (done) {
      db.connect('fossa', function () {
        db.collection('test', function () {
          expect(db.client.store).to.be.an('object');
          db.client.store.findOne({b:1}, function (err, item) {
            expect(err).to.equal(null);
            expect(item.b).to.equal(1);
            done();
          });
        });
      });
    });
  });
});
