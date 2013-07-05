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
var collection = require('./lib/collection')
  , model = require('./lib/model');

//
// Expose backbone events.
//
var fossa = module.exports
  , MongoClient = mongo.MongoClient
  , Server = mongo.Server;

/**
 * Constructor of Fossa.
 *
 * @Constructor
 * @api public
 */
function Fossa(options) {
  // Default to localhost, standard port and the native C++ BSON parser.
  options.host = options.host || 'localhost';
  options.port = options.port || 27017;
  options.options = options.options || { native_parser: true };

  // Store the options.
  this.options = options;

  // Prepare connection.
  this.init(options.host, options.port, options.options);

  // Prepare a default model and collection sprinkled with MongoDB proxy methods.
  this.Model = Backbone.Model.extend(model);
  this.Collection = collection({ fossa: this });
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
 * @param {String} database name
 * @param {String} collection name
 * @param {Function} fn callback
 * @api public
 */
Fossa.prototype.connect = function connect(database, collection, fn) {
  var self = this
    , client;

  // If no collection string is supplied it must be a callback.
  if (typeof collection === 'function') {
    fn = collection;
    collection = null;
  }

  // If no database was set before mitigating to the collection, fail.
  if (!database) fn(new Error('Provide database name with #use before saving.'));

  // If there is a connected client simply switch the pool over to another database.
  if (self.client) return process.nextTick(function switchClient() {
    client = self.client.db(database);

    // Only set collection if supplied
    fn(null, collection ? self.collection(collection) : client);
  });

  // Open a new connection to a MongoDB instance.
  self.mongoclient.open(function(err, client) {
    if (err) return self.emit('error', err);

    self.client = client = client.db(database);
    fn(err, collection ? self.collection(collection) : client);
  });
};

/**
 * Switch to the supplied collection.
 *
 * @param {String} name collection name
 * @return {Object} MongoDB collection methods
 * @api public
 */
Fossa.prototype.collection = function collection(name) {
  return this.client.collection(name);
};

//
// Expose the module.
//
module.exports = Fossa;
