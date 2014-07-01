'use strict';

var chai = require('chai')
  , sinon = require('sinon')
  , mongo = require('mongodb')
  , sinonChai = require('sinon-chai');

chai.use(sinonChai);
chai.config.includeStack = true;

//
// Expose Fossa and submodules.
//
exports.Fossa = require('../');
exports.Model = require('../lib/model');
exports.Collection = require('../lib/collection');
exports.db = new mongo.Db('fossa', new mongo.Server('localhost', 27017), {w:1});

//
// Insert test content in the database.
//
exports.prepare = function prepare(done) {
  var db = new mongo.Db('fossa', new mongo.Server('localhost', 27017), {w:1});

  db.open(function(err, db) {
    db.createCollection('test', function(err, collection) {
      collection.insert([{a:1, b:1}, {c:1, d:1}], {w:1}, function () {
        db.createCollection('test1', function(err, collection) {
          collection.insert([{e:1, f:1}, {g:1, h:1}], {w:1}, function () {
            db.close(done);
          });
        });
      });
    });
  });
};

//
// Clear the content of the test database
//
exports.clear = function clear(done) {
  var db = new mongo.Db('fossa', new mongo.Server('localhost', 27017), {w:1});
  db.open(function(err, db) {
    db.dropDatabase(function () {
      db.close(done);
    });
  });
};

//
// Expose our assertations.
//
exports.expect = chai.expect;
exports.sinon = sinon;
