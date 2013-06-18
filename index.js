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
var model = require('./lib/collection');

//
// Expose backbone events.
//
var fossa = module.exports
  , MongoClient = mongo.MongoClient
  , Server = mongo.Server;

/**
 * Constructor of Fossa.
 *
 * @api public
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
 * Create a new collection instance.
 *
 * @param {String} name collection name
 * @param {Object} options
 * @api public
 */
Fossa.prototype.collection = function collection(name, options) {
  options = options || {};

  // Prepare a default collection sprinkled with MongoDB proxy methods.
  options.collection = name;
  options.fossa = this;

  return model(options);
};

//
// Expose the module.
//
module.exports = Fossa;
