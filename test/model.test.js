describe('Fossa Model', function () {
  'use strict';

  var common = require('./common')
    , ObjectID = require('mongodb').ObjectID
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

  afterEach(function () {
    db = null;
  });

  it('is extendable', function () {
    expect(db.Model.extend).to.be.a('function');

    var Custom = db.Model.extend({ test: function test() { return true; } })
      , custom = new Custom;

    expect(custom).to.have.property('test');
    expect(custom.test).to.be.a('function');
    expect(custom.test()).to.equal(true);
  });

  it('has a reference to the Fossa instance', function () {
    var model = new db.Model;

    expect(model.fossa).to.equal(db);
    expect(model.fossa).to.be.a('object');
    expect(model.fossa).to.be.an.instanceof(Fossa);
  });

  it('maps _id as internal id', function () {
    var id = new ObjectID
      , model = new db.Model({ _id: id });

    expect(model).to.be.an('object');
    expect(model.id).to.equal(id);
    expect(model.attributes).to.have.property('_id', id);
  });

  it('sets a unique MongoDB ObjectID by default', function () {
    var model = new db.Model;
    expect(model.id).to.be.an.instanceof(ObjectID);
  });

  it('sets a unique MongoDB ObjectID if ID is not of type ObjectID', function () {
    var model = new db.Model({ _id: 'falseID' });
    expect(model.id).to.be.an.instanceof(ObjectID);
  });

  it('can be stored in MongoDB if it has a collection reference', function (done) {
    var model = new db.Model({
      username: 'test'
    });

    model.urlRoot = 'users';
    model.use('test').sync(function synced(err, result) {
      done();
    });
  });
});
