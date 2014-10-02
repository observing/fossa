describe('Fossa constructor', function () {
  'use strict';

  var common = require('./common')
    , expect = common.expect
    , Fossa = common.Fossa
    , db;

  //
  // Establish connection to db
  //
  before(function (done) {
    common.prepare(done);
  });

  after(function (done) {
    common.clear(done);
  });

  beforeEach(function () {
    db = new Fossa;
  });

  afterEach(function (done) {
    db.close(function () {
      db = null;
      done();
    });
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

  it('additional options can be merged, per example from a plugin', function () {
    expect(db.options.merge).to.be.a('function');
    expect(db.options('test')).to.equal(undefined);

    var fossa = new Fossa({ host: '127.0.0.1' });
    fossa.options.merge({ test: 'additional' });
    expect(fossa.options('test')).to.equal('additional');
  });

  describe('#connect', function () {
    it('to mongoDB or returns opened connection from the pool', function (done) {
      db.connect('fossa', function (error, client) {
        expect(error).to.equal(null);
        expect(client).to.be.an('object');
        expect(client).to.have.property('databaseName', 'fossa');
        expect(client).to.have.property('serverConfig');
        done();
      });
    });

    it('throws an error if the database name is missing', function () {
      db.connect(null, function (error, client) {
        expect(error).to.be.instanceof(Error);
        expect(error).to.be.an('object');
        expect(error.message).to.be.include('database name with #use before');
        expect(client).to.equal(undefined);
      });
    });

    it('pushes additional connection request to the queue if connection is opening', function () {
      db.connect('fossa', function noop() { });

      expect(db.queue).to.be.an('array');
      expect(db.queue).to.have.length(1);
      expect(db.connecting).to.equal(true);

      db.connect('fossa', function (error, client) {
        expect(error).to.equal(null);
        expect(client).to.be.an('object');
      });
    });

    it('will return database client if called without collection after connection is opened', function (done) {
      db.connect('fossa', function (error, client) {
        db.connect('test', function (error, another) {
          expect(error).to.equal(null);
          expect(another).to.be.an('object');
          expect(another).to.have.property('databaseName', 'test');
          expect(another).to.have.property('serverConfig');
          done();
        });
      });
    });

    it('switches to the proper collection', function (done) {
      db.connect('fossa', 'test', function (error, client) {
        client.findOne({b:1}, function (err, item) {
          expect(err).to.equal(null);
          expect(item.b).to.equal(1);

          db.connect('fossa', 'test1', function (error, client) {
            client.findOne({f:1}, function (err, item) {
              expect(err).to.equal(null);
              expect(item.f).to.equal(1);
              done();
            });
          });
        });
      });
    });
  });

  describe('#auth', function () {
    it('is a function');
    it('provides a convenience method to authenticate against a database');
    it('returns the result of the authentication');
  });

  describe('#switch', function () {
    it('provides connection configured against database', function (done) {
      db.switch('test', null, function switched(error, client) {
        expect(error).to.equal(null);
        expect(client).to.be.an('object');
        expect(client).to.have.property('databaseName', 'test');
        done();
      });
    });

    it('provides connection configured against optional collection', function (done) {
      db.switch('another', 'customCollection', function switched(error, client) {
        expect(error).to.equal(null);
        expect(client).to.be.an('object');
        expect(client).to.have.property('collectionName', 'customCollection');
        expect(client.db).to.be.an('object');
        expect(client.db).to.have.property('databaseName', 'another');
        done();
      });
    });
  });

  describe('#open', function () {
    it('opens a connection', function (done) {
      db.open(function (error, client) {
        expect(error).to.equal(null);
        expect(client).to.be.an('object');
        expect(client).to.have.property('_db');
        expect(client._db).to.have.property('openCalled', true);
        expect(db.connecting).to.equal(false);
        done();
      });
    });

    it('keeps connecting state to prevent double `open` calls', function () {
      db.open(function (error, client) {
        expect(db.connecting).to.equal(false);
        done();
      });

      expect(db.connecting).to.equal(true);
    });

    it('authenticates the connection if required');
    it('defaults to admin database if no `db` key is provided');
  });

  describe('#close', function () {
    it('closes the active connection on mongoclient', function (done) {
      db.close(function (error, result) {
        expect(error).to.equal(null);
        expect(result).to.equal(undefined);
        done();
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
      db.connect('fossa', function (error, client) {
        db.collection(client, 'test', function (error, collection) {
          collection.findOne({b:1}, function (err, item) {
            expect(err).to.equal(null);
            expect(item.b).to.equal(1);
            done();
          });
        });
      });
    });
  });
});
