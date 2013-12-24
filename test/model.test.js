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

  it('maps _id as internal id', function () {
    var id = new ObjectID
      , model = new db.Model({ _id: id });

    expect(model).to.be.an('object');
    expect(model.id).to.equal(id);
    expect(model.attributes).to.have.property('_id', id);
  });

  it('sets a unique mongoDB ObjectID by default', function () {
    var model = new db.Model;
    expect(model.id).to.be.an.instanceof(ObjectID);
  });

  it('sets a unique mongoDB ObjectID if ID is not of type ObjectID', function () {
    var model = new db.Model({ _id: 'falseID' });
    expect(model.id).to.be.an.instanceof(ObjectID);
  });
});


