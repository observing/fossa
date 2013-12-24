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
 * @param {Object} options
 * @api public
 */
function Fossa(options) {
  // Store the options.
  this.options = options = this.options(options || {});
  this.plugins = Object.create(null);

  // Prepare connection.
  this.init(
    options('host', 'localhost'),
    options('port', 27017),
    options
  );

  // Prepare a default model and collection sprinkled with MongoDB proxy methods.
  this.Model = model;
  this.Collection = collection(this);
}

//
// Allow event emitting from Fossa.
//
Fossa.prototype.__proto__ = EventEmitter.prototype;

/**
 * Checks if options exists.
 *
 * @param {Object} obj
 * @returns {Function}
 * @api private
 */
Fossa.prototype.options = function options(obj) {
  return function get(key, backup) {
    return key in obj ? obj[key] : backup;
  };
};

/**
 * Initialize a MongoClient and Server.
 *
 * @param {String} host MongoDB host
 * @param {Number} port MongoDB port, usually 27017
 * @param {Object} options MongoDB client options
 * @return {Fossa} fluent interface
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
 * @return {Fossa} fluent interface
 * @api public
 */
Fossa.prototype.connect = function connect(database, collection, fn) {
  var fossa = this;

  //
  // If no collection string is supplied it must be a callback.
  //
  if (typeof collection === 'function') {
    fn = collection;
    collection = null;
  }

  //
  // If no database was set before mitigating to the collection, fail.
  //
  if (!database) fn(new Error('Provide database name with #use before saving.'));

  //
  // If there is a connected client simply switch the pool over to another database.
  //
  if (fossa.client) {
    return process.nextTick(function switchClient() {
      fossa.client = fossa.client.db(database);

      //
      // If a collection was supplied defer in a safe manner.
      //
      if (collection) return fossa.collection(collection, fn);
      fn(null, fossa.client);
    });
  }

  //
  // Open a new connection to a MongoDB instance.
  //
  fossa.mongoclient.open(function(err, client) {
    if (err) return fn(err);

    fossa.client = client.db(database);

    //
    // If a collection was supplied defer in a safe manner.
    //
    if (collection) return fossa.collection(collection, fn);
    fn(err, fossa.client);
  });

  return this;
};

/**
 * Switch to the supplied collection.
 *
 * @param {String} name collection name
 * @param {Function} fn callback
 * @return {Fossa} fluent interface
 * @api public
 */
Fossa.prototype.collection = function collection(name, fn) {
  var fossa = this;

  this.client.collection(name, function switched(err, collection) {
    if (err) return fn(err);

    fossa.client.store = collection;
    fn(err, collection);
  });

  return this;
};

/**
 * Register a new plugin.
 *
 * ```js
 * fossa.use('name', function calculate(fossa, options) {
 *  // do stuff
 * },
 * ```
 *
 * @param {String} name The name of the plugin.
 * @param {Function} plugin The plugin with function that holds alternative logic
 * @api public
 */
Fossa.prototype.use = function use(name, plugin) {
  if ('object' === typeof name && !plugin) {
    plugin = name;
    name = plugin.name;
  }

  if (!name) throw new Error('Plugin should be specified with a name');
  if ('string' !== typeof name) throw new Error('Plugin names should be a string');
  if ('string' === typeof plugin) plugin = require(plugin);

  //
  // Plugin accepts a function only.
  //
  if ('function' !== typeof plugin) throw new Error('Plugin should be a function');
  if (name in this.plugins) throw new Error('The plugin name was already defined');

  this.plugins[name] = plugin;
  plugin.call(this, this, this.options);

  return this;
};

/**
 * Create a new Fossa server.
 *
 * @param {String} host Server location
 * @param {Number} port Port number
 * @param {Object} options Configuration.
 * @returns {Fossa}
 * @api public
 */
Fossa.create = function create(host, port, options) {
  options = options || {};

  options.host = host = host || 'localhost';
  options.port = port = port || 27017;
  options.native_parser = true;

  return new Fossa(options);
};

//
// Also export the orginal mongo module so it can be used easily.
//
Fossa.mongo = mongo;

//
// Expose the module.
//
module.exports = Fossa;
