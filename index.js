'use strict';

//
// Native modules.
//
var EventEmitter = require('events').EventEmitter;

//
// Third-party modules.
//
var _ = require('lodash')
  , mongo = require('mongodb')
  , Backbone = require('backbone');

//
// Required modules.
//
var defaultModel = require('./lib/model')
  , Methods = require('./lib/methods');

//
// Expose backbone events.
//
var fossa = module.exports
  , MongoClient = mongo.MongoClient
  , Server = mongo.Server;

/**
 * Constructor.
 */
function Fossa(options) {
  // Default to localhost, standard port and the native C++ BSON parser.
  options.host = options.host || 'localhost';
  options.port = options.port || 27017;
  options.mongoclient = options.mongoclient || { native_parser: true };

  // Store the options.
  this.options = options;

  // Prepare connection.
  this.init(options.host, options.port, options.mongoclient);
}

// Allow event emitting from Fossa.
Fossa.prototype.__proto__ = EventEmitter.prototype;

/**
 * Initialize a MongoClient and Server.
 *
 * @param {String} host MongoDB host
 * @param {Number} port MongoDB port, usually 27017
 * @param {Object} options MongoDB client options
 * @return this
 * @api public
 */
Fossa.prototype.init = function init(host, port, options) {
  this.mongoclient = new MongoClient(new Server(host, port, options));
  return this;
};

/**
 * Connect to MongoDb, otherwise return already opened connection.
 *
 * @param {Function} fn callback
 * @api public
 */
Fossa.prototype.connect = function connect(fn) {
  if (this.client) return process.nextTick(fn.bind(fn, null, this.client));

  this.mongoclient.open(function(err, db) {
    if (err) return this.emit('error', err);

    fn(err, this.client = db);
  }.bind(this));
};

/**
 * Prepare a default model sprinkled with MongoDB methods.
 *
 * @param {String} collection name
 * @api public
 */
Fossa.prototype.model = function model(collection) {
  if (!collection) this.emit('error', new Error('Collection missing'));

  return Backbone.Model.extend(
      defaultModel({ fossa: this, collection: collection })
    , new Methods
  );
};

//
// Expose the module.
//
module.exports = Fossa;
