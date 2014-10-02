'use strict';

//
// Required modules.
//
var collection = require('./lib/collection')
  , model = require('./lib/model')
  , mongo = require('mongodb')
  , fuse = require('fusing');

//
// References to mongo logic.
//
var MongoClient = mongo.MongoClient
  , Server = mongo.Server;

/**
 * Queryable options with merge and fallback functionality.
 *
 * @param {Object} obj
 * @param {Fossa} fossa instance
 * @returns {Function}
 * @api private
 */
function configure(obj, fossa) {
  function get(key, backup) {
    return key in obj ? obj[key] : backup;
  }

  //
  // Allow new options to be be merged in against the original object.
  //
  get.merge = function merge(properties) {
    return fossa.merge(obj, properties);
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
  this.fuse();

  //
  // Store the options.
  //
  this.writable('queue', []);
  this.writable('plugins', {});
  this.writable('connecting', false);
  this.readable('options', configure(options || {}, this));

  //
  // Prepare a default model and collection sprinkled with MongoDB proxy methods.
  //
  this.readable('Model', model(this));
  this.readable('Collection', collection(this));

  //
  // Prepare connection.
  //
  this.init(
    this.options('host', 'localhost'),
    this.options('port', 27017),
    this.options
  );
}

//
// Extend fossa with an EventEmitter.
//
fuse(Fossa, require('eventemitter3'));

/**
 * Initialize a MongoClient and Server.
 *
 * @param {String} host MongoDB host
 * @param {Number} port MongoDB port, usually 27017
 * @param {Object} options MongoDB client options
 * @return {Fossa} fluent interface
 * @api public
 */
Fossa.readable('init', function init(host, port, options) {
  this.mongoclient = new MongoClient(new Server(host, port, options));

  return this;
});

/**
 * Connect to MongoDb, otherwise return already opened connection.
 *
 * @param {String} database name
 * @param {String} collection name
 * @param {Function} done callback
 * @return {Fossa} fluent interface
 * @api public
 */
Fossa.readable('connect', function connect(database, collection, done) {
  var fossa = this
    , request;

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
  // Fastest method, the client was already connected to MongoDB,
  // so we can easily switch to he correct database and collection.
  //
  if (this.mongoclient._db.openCalled && !this.connecting) {
    return this.switch(database, collection, done);
  }

  //
  // If we are still connecting to the database, queue the current connect request.
  //
  request = [ database, collection, done ];
  if (this.connecting) return this.queue.push(request);

  //
  // Open a new connection to a MongoDB instance, also queue the first request
  // so that it can be processed after the connection is opened.
  //
  this.queue.push(request);
  return this.open(function connected(error, client) {
    if (error) return fossa.emit('error', error);

    fossa.queue.forEach(function loop(request) {
      fossa.switch.apply(fossa, request);
    });
  });
});

/**
 * Convenience authentication helper.
 *
 * @param {String} database Authenticate against this database.
 * @param {String} username
 * @param {String} password
 * @param {Function} done Completion callback.
 * @api public
 */
Fossa.readable('auth', function auth(database, username, password, done) {
  this.connect(database, function open(error, client) {
    if (error) return done(error);
    client.authenticate(username, password, done);
  });
});

/**
 * Provide a properly configured MongoDB client to the callback.
 *
 * @param {String} database name
 * @param {String} collection name
 * @param {Function} done Completion callback
 * @api private
 */
Fossa.readable('switch', function switching(database, collection, done) {
  var client = this.mongoclient.db(database);

  //
  // If a collection was supplied, also switch to the collection.
  //
  if (collection) return this.collection(client, collection, done);
  done(null, client);
});

/**
 * Open a connection to MongoDB.
 *
 * @param {Function} done Completion callback.
 * @return {Fossa} fluent interface
 */
Fossa.readable('open', function open(done) {
  var fossa = this;

  this.connecting = true;
  fossa.mongoclient.open(function opened(error, client) {
    fossa.connecting = false;
    done(error, client);
  });

  return this;
});

/**
 * Close the connection with the database.
 *
 * @param {Function} done callback
 * @return {Fossa} fluent interface
 * @api public
 */
Fossa.readable('close', function close(done) {
  this.mongoclient.close(done);

  return this;
});

/**
 * Switch to the supplied collection.
 *
 * @param {MongoClient} client Initialized connection.
 * @param {String} name collection name
 * @param {Function} done callback
 * @return {Fossa} fluent interface
 * @api public
 */
Fossa.readable('collection', function collection(client, name, done) {
  var fossa = this;

  client.collection(name, function switched(error, collection) {
    if (error) return done(error);

    done(error, collection);
  });

  return this;
});

/**
 * Fetch documents from MongoDB and initialize a collection.
 *
 * @param {String} db database name
 * @param {String} collection collection name
 * @param {Function} done callback.
 * @api public
 */
Fossa.readable('get', function get(db, collection, done) {
  var fossa = this;

  this.connect(db, collection, function connected(error, client) {
    if (error) return done(error);

    client.find().toArray(function getAll(error, results) {
      if (error) return done(error);

      return (null, new fossa.Collection(results));
    });
  });
});

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
Fossa.readable('use', function use(name, plugin) {
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
});

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
