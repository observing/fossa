'use strict';

//
// Required modules.
//
var collection = require('./lib/collection')
  , predefine = require('predefine')
  , model = require('./lib/model')
  , mongo = require('mongodb');

//
// References to mongo logic.
//
var MongoClient = mongo.MongoClient
  , Server = mongo.Server;

/**
 * Queryable options with merge and fallback functionality.
 *
 * @param {Object} obj
 * @returns {Function}
 * @api private
 */
function configure(obj) {
  function get(key, backup) {
    return key in obj ? obj[key] : backup;
  }

  //
  // Allow new options to be be merged in against the original object.
  //
  get.merge = function merge(properties) {
    return predefine.merge(obj, properties);
  };

  return get;
}

/**
 * Constructor of Fossa.
 *
 * @Constructor
 * @param {Object} options
 * @api public
 */
function Fossa(options) {
  var readable = predefine(this)
    , writable = predefine(this, predefine.WRITABLE);

  //
  // Store the options.
  //
  writable('plugins', {});
  readable('options', configure(options || {}));

  //
  // Prepare a default model and collection sprinkled with MongoDB proxy methods.
  //
  readable('Model', model(this));
  readable('Collection', collection(this));

  //
  // Prepare connection.
  //
  this.init(
    this.options('host', 'localhost'),
    this.options('port', 27017),
    this.options
  );
}

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
 * @param {Function} done callback
 * @return {Fossa} fluent interface
 * @api public
 */
Fossa.prototype.connect = function connect(database, collection, done) {
  var fossa = this;

  //
  // If no collection string is supplied it must be a callback.
  //
  if (typeof collection === 'function') {
    done = collection;
    collection = null;
  }

  //
  // If no database was set before mitigating to the collection, fail.
  //
  if (!database) done(new Error('Provide database name with #use before saving.'));

  //
  // If there is a connected client simply switch the pool over to another database.
  //
  if (fossa.client) {
    return process.nextTick(function switchClient() {
      fossa.client = fossa.client.db(database);

      //
      // If a collection was supplied defer in a safe manner.
      //
      if (collection) return fossa.collection(collection, done);
      done(null, fossa.client);
    });
  }

  //
  // Open a new connection to a MongoDB instance.
  //
  fossa.mongoclient.open(function(error, client) {
    if (error) return done(error);

    fossa.client = client.db(database);

    //
    // If a collection was supplied defer in a safe manner.
    //
    if (collection) return fossa.collection(collection, done);
    done(error, fossa.client);
  });

  return this;
};

/**
 * Close the connection with the database.
 *
 * @param {Function} done callback
 * @return {Fossa} fluent interface
 * @api public
 */
Fossa.prototype.close = function close(done) {
  this.client.close(done);

  return this;
};

/**
 * Switch to the supplied collection.
 *
 * @param {String} name collection name
 * @param {Function} done callback
 * @return {Fossa} fluent interface
 * @api public
 */
Fossa.prototype.collection = function collection(name, done) {
  var fossa = this;

  this.client.collection(name, function switched(error, collection) {
    if (error) return done(error);

    fossa.client.store = collection;
    done(error, collection);
  });

  return this;
};

/**
 * Fetch documents from MongoDB and initialize a collection.
 *
 * @param {String} db database name
 * @param {String} collection collection name
 * @param {Function} done callback.
 * @api public
 */
Fossa.prototype.get = function get(db, collection, done) {
  var fossa = this;

  this.connect(db, collection, function connected(error, client) {
    if (error) return done(error);

    client.find().toArray(function getAll(error, results) {
      if (error) return done(error);

      return (null, new fossa.Collection(results));
    });
  });
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
