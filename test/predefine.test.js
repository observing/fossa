describe('Predefine', function () {
  'use strict';

  var common = require('./common')
    , backbone = require('backbone')
    , predefine = require('../lib/predefine')
    , expect = common.expect
    , Base;

  beforeEach(function () {
    Base = predefine(backbone.Model.extend({}));
  });

  afterEach(function () {
    Base = null;
  });

  it('provides constructer with readable and writeable functionality', function () {
    expect(Base.prototype).to.have.property('readable');
    expect(Base.prototype).to.have.property('writable');
    expect(Base.prototype.readable).to.be.a('function');
    expect(Base.prototype.writable).to.be.a('function');
  });

  it('adds a readabe CRUD reference', function () {
    var properties = Object.getOwnPropertyDescriptor(Base.prototype, '_crud');

    expect(properties.value).to.be.an('array');
    expect(properties.writable).to.equal(false);
    expect(properties.enumerable).to.equal(false);
    expect(properties.value).to.include('patch');
    expect(properties.value).to.include('create');
    expect(properties.value).to.include('read');
    expect(properties.value).to.include('update');
    expect(properties.value).to.include('delete');
  });

  it('#use sets the database to use for sync and returns instance', function () {
    var model = new Base
      , returns = model.use('observer');

    expect(model).to.have.property('use');
    expect(model.use).to.be.a('function');
    expect(model).to.have.property('_database', 'observer');
    expect(returns).to.be.instanceof(Base);
  });

  it('#define sets property on actual model returns instance', function () {
    var model = new Base
      , returns = model.define('urlRoot', 'users');

    expect(model).to.have.property('define');
    expect(model.define).to.be.a('function');
    expect(model).to.have.property('urlRoot', 'users');
    expect(returns).to.be.instanceof(Base);
  });

  it('#client creates connection to MongoDB with proper database and collection', function (done) {
    var model = new Base;
    model.fossa = {
      connect: function (database, collection, fn) {
        expect(database).to.equal('observer');
        expect(collection).to.equal('users');
        fn(null, 'connection');
      }
    };

    model.use('observer').define('urlRoot', 'users').client(function (err, result) {
      expect(err).to.equal(null);
      expect(result).to.equal('connection');
      done();
    });
  });

  describe('#setup', function () {
    it('will register listeners for before/after hooks', function () {
      var Model = Base.extend({
            before: { 'create username': 'username' },
            after: { 'delete username': 'username' }
          })
        , model = new Model;

      model.setup(['before']);
      expect(model._events).to.have.property('before:create');
      expect(model._events['before:create']).to.be.an('array');
      expect(model._events['before:create'][0]).to.be.an('object');
      expect(model._events['before:create'][0].callback).to.be.a('function');

      model.setup(['after']);
      expect(model._events).to.have.property('after:delete');
      expect(model._events['after:delete']).to.be.an('array');
      expect(model._events['after:delete'][0]).to.be.an('object');
      expect(model._events['after:delete'][0].callback).to.be.a('function');
    });

    it('will ignore unknown hooks', function () {
      var Model = Base.extend({
            after: { 'new username': 'username' }
          })
        , model = new Model;

      model.setup(['after']);
      expect(model).to.not.have.property('_events');
    });
  });
});
