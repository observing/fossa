describe('Fossa Model', function () {
  'use strict';

  var common = require('./common')
    , ObjectID = require('mongodb').ObjectID
    , expect = common.expect
    , Fossa = common.Fossa
    , db = common.db
    , fossa;

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
    common.clear(done);
  });

  beforeEach(function () {
    fossa = new Fossa;
  });

  afterEach(function () {
    fossa = null;
  });

  it('is extendable', function () {
    expect(fossa.Model.extend).to.be.a('function');

    var Custom = fossa.Model.extend({ test: function test() { return true; } })
      , custom = new Custom;

    expect(custom).to.have.property('test');
    expect(custom.test).to.be.a('function');
    expect(custom.test()).to.equal(true);
  });

  it('has a reference to the Fossa instance', function () {
    var model = new fossa.Model;

    expect(model.fossa).to.equal(fossa);
    expect(model.fossa).to.be.a('object');
    expect(model.fossa).to.be.an.instanceof(Fossa);
  });

  it('maps _id as internal id', function () {
    var id = new ObjectID
      , model = new fossa.Model({ _id: id });

    expect(model).to.be.an('object');
    expect(model.id).to.equal(id);
    expect(model.attributes).to.have.property('_id', id);
  });

  it('sets a unique MongoDB ObjectID by default', function () {
    var model = new fossa.Model;
    expect(model.id).to.be.an.instanceof(ObjectID);
  });

  it('sets a unique MongoDB ObjectID if ID is not of type ObjectID', function () {
    var model = new fossa.Model({ _id: 'falseID' });
    expect(model.id).to.be.an.instanceof(ObjectID);
  });

  describe('#sync', function () {
    it('can be stored in MongoDB by sync with urlRoot property', function (done) {
      var model = new fossa.Model({ username: 'test' });

      model
        .define('urlRoot','users')
        .use('fossa')
        .sync()
        .done(function synced(err, result) {
          db.collection('users').findOne({ _id: model.id }, function (err, item) {
            expect(err).to.equal(null);
            expect(item).to.have.property('_id');
            expect(item._id.toString()).to.equal(model.id.toString());
            expect(item).to.have.property('username', 'test');
            done();
          });
        });
    });

    it('switches to PUT if the model with ObjectID exists', function (done) {
      var id = new ObjectID
        , model = new fossa.Model({ _id: id, username: 'test' });

      model
        .define('urlRoot','users')
        .use('fossa')
        .sync()
        .done(function synced(err, result) {
          model.set('username', 'changed');
          model.sync().done(function synced(err, result) {
            db.collection('users').findOne({ _id: id }, function (err, item) {
              expect(err).to.equal(null);
              expect(item).to.have.property('_id');
              expect(item._id.toString()).to.equal(id.toString());
              expect(item).to.have.property('username', 'changed');
              done();
            });
          });
      });
    });

    it('returns an error when updating a undefined model in MongoDB', function (done) {
      var model = new fossa.Model({ username: 'test' });

      model
        .define('urlRoot','users')
        .use('fossa')
        .sync('update')
        .done(function synced(err, result) {
          expect(err).to.be.instanceof(Error);
          expect(err).to.have.property('name', 'MongoError');
          expect(err).to.have.property('err', 'Mod on _id not allowed');
          expect(err.message).to.equal('Mod on _id not allowed');
          done();
        });
    });

    it('can pass MongoDB options, per example wtimeout', function (done) {
      var model = new fossa.Model({ fn: function serialize() { return true; } });

      model
        .define('urlRoot','users')
        .use('fossa')
        .sync({ serializeFunctions: true })
        .done(function synced(err, result) {
          db.collection('users').findOne({ _id: model.id }, function (err, item) {
            expect(item).to.have.property('fn');
            expect(item.fn).to.have.property('code', 'function serialize() { return true; }');
            expect(item.fn).to.have.property('scope');
            done();
          });
        });
    });

    it('can pass MongoDB options to PUT, per example upsert', function (done) {
      var model = new fossa.Model({ username: 'upsert' });

      model
        .define('urlRoot','users')
        .use('fossa')
        .sync('update', { upsert: true })
        .done(function synced(err, result) {
          db.collection('users').findOne({ _id: model.id }, function (err, item) {
            expect(item).to.have.property('username', 'upsert');
            done();
          });
        });
    });
  });

  describe('#save', function () {
    it('Saves new model by default', function (done) {
      var model = new fossa.Model({'username': 'save'});

      model
        .define('urlRoot','users')
        .use('fossa')
        .save()
        .done(function () {
          db.collection('users').findOne({ _id: model.id }, function (err, item) {
            expect(item).to.have.property('username', 'save');
            done();
          });
        });
    });

   it('Updates existing model with changed attributes if patch:true', function (done) {
      var model = new fossa.Model({'username': 'test'});

      model
        .define('urlRoot','users')
        .use('fossa')
        .save()
        .done(function first() {
          model
            .save({ username: 'patch' }, { patch: true })
            .done(function synced(err, result) {
              db.collection('users').findOne({ _id: model.id }, function (err, item) {
                expect(item.username).to.equal('patch');
                done();
              });
            });
        });
    });

    it('Defaults to CREATE on new model if patch:true', function (done) {
      var model = new fossa.Model;

      model
        .define('urlRoot','users')
        .use('fossa')
        .save({ username: 'patch' }, { patch: true })
        .done(function synced(err, items) {
          expect(items.length).to.equal(1);
          expect(items[0]).to.have.property('username', 'patch');
          done();
        });
    });
  });
});
