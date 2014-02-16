describe('Fossa Collection', function () {
  'use strict';

  var common = require('./common')
    , ObjectID = require('mongodb').ObjectID
    , _ = require('lodash')
    , expect = common.expect
    , Fossa = common.Fossa
    , db = common.db
    , Users, fossa;

  //
  // Establish connection to db
  //
  before(function (done) {
    db.open(function(err, db) {
      db = db;
      common.prepare(done);
    });
  });

  after(function (done) {
    common.clear(function () {
      db.close(done);
    });
  });

  beforeEach(function () {
    fossa = new Fossa;
    Users = fossa.Collection.extend({ url: 'users' });
  });

  afterEach(function () {
    fossa = null;
    Users = null;
  });

  it('is extendable', function () {
    expect(fossa.Collection.extend).to.be.a('function');

    var Custom = fossa.Collection.extend({ test: function test() { return true; } })
      , custom = new Custom;

    expect(custom).to.have.property('test');
    expect(custom.test).to.be.a('function');
    expect(custom.test()).to.equal(true);
  });

  it('has a reference to the Fossa instance', function () {
    var collection = new fossa.Collection;

    expect(collection.fossa).to.equal(fossa);
    expect(collection.fossa).to.be.a('object');
    expect(collection.fossa).to.be.an.instanceof(Fossa);
  });

  it('has helper #id to get model by ObjectID', function () {
    var id = new ObjectID
      , collection = new fossa.Collection([{ _id: id }]);

    expect(collection.id).to.be.a('function');
    expect(collection.id(id)).to.be.an('object');
    expect(collection.id(id).get('_id')).to.equal(id);
  });

  it('can be provided with a database options', function () {
    var collection = new fossa.Collection({ database: 'fossa' });
    expect(collection._database).to.equal('fossa');
    expect(collection._database).to.be.a('string');
  });

  describe('#sync', function () {
    it('inserts new models in the database', function (done) {
      var o1 = new fossa.Model
        , o2 = new fossa.Model
        , users = new Users([o1, o2], { database: 'fossa' });

      users.sync().done(function (error, results) {
        expect(error).to.equal(null);
        expect(results).to.be.an('array');
        db.collection('users').find().toArray(function (err, items) {
          var flat = _.pluck(items, '_id').map(String);
          expect(err).to.equal(null);
          expect(items).to.be.an('array');
          expect(items[0]).to.have.property('_id');
          expect(items[1]).to.have.property('_id');
          expect(flat).to.include(o1.id.toString());
          expect(flat).to.include(o2.id.toString());
          done();
        });
      });
    });

    it('deletes all models from the collection', function (done) {
      var o1 = new fossa.Model
        , o2 = new fossa.Model
        , users = new Users([o1, o2], { database: 'fossa' });

      users.sync().done(function (error, results) {
        users.sync('delete').done(function (error, results) {
          expect(results).to.equal(2);
          db.collection('users').find().toArray(function (err, items) {
            var flat = _.pluck(items, '_id').map(String);
            expect(items).to.not.include(o1.id.toString());
            expect(items).to.not.include(o2.id.toString());
            done();
          });
        });
      });
    });

    it('reads models from the database collection', function (done) {
      var Test = fossa.Collection.extend({ url: 'test' })
        , test = new Test({ database: 'fossa' });

      test.sync('read').done(function (error, results) {
        expect(results).to.be.an('array');
        expect(test.models).to.be.an('array');
        expect(test.models).to.have.length(2);
        expect(test.findWhere({a: 1})).to.be.an('object');
        done();
      });
    });
  });

  describe('#fetch', function () {
    it('reads models from the database collection', function (done) {
      var Test = fossa.Collection.extend({ url: 'test' })
        , test = new Test({ database: 'fossa' });

      test.fetch().done(function (error, results) {
        expect(results).to.be.an('array');
        expect(test.models).to.be.an('array');
        expect(test.models).to.have.length(2);
        expect(test.findWhere({a: 1})).to.be.an('object');
        done();
      });
    });
  });
});
