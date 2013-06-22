'use strict';

//
// Required modules.
//
var _ = require('lodash')
  , async = require('async')
  , mongo = require('mongodb')
  , Backbone = require('backbone');

//
// Local modules.
//
var Static = require('./static')
  , model = require('./model');

/**
 * Create a collection of sub documents.
 *
 * @param {Constructor} Child sub document constructor
 * @param {Object} parent main document
 * @return {Object} constructed sub document
 * @api private
 */
function createSubCollection(Child, parent) {
  Child.prototype.save = Child.prototype.save.bind(parent);
  return new Child;
}

/**
 * Default model definition of fossa.
 *
 * Options:
 *   - fossa {Fossa} instance for use of connected client.
 *   - database {String} Database name.
 *   - collection {String} Name of the collection.
 *
 * @param {Object} options
 * @api public
 */
module.exports = function collection(options) {
  return Backbone.Collection.extend({
    /**
     * Default model definition for Fossa.
     *
     * @api private
     */
    model: Backbone.Model.extend(model)

    /**
     * Collection instantiation, stores provided options in instance.
     *
     * @Constructor
     * @api public
     */
  , initialize: function initialize() {
      // Initialize subdocuments.
      var subdocs = options.subdocs;
      if (subdocs) {
        Object.keys(subdocs).forEach(function addSubDocs(key) {
          this[key] = createSubCollection(subdocs[key], this);
        }.bind(this));

        // Remove the key from the options.
        delete options.subdocs;
      }

      // Store references the collection name, database and fossa.
      _.extend(this, options);
    }

    /**
     * Proxy method to change the database used to store the collection.
     *
     * @param {String} database name
     * @return {Collection} this
     * @api public
     */
  , use: function use(database) {
      this.database = database;
      return this;
    }

    /**
     *
     * Query the collection, local has priority of the database.
     */
  , fetch: function fetch() {

    }

    /**
     * Get the client against the proper database and collection.
     * TODO: check if this can be moved to static, to prevent exposure.
     *
     * @param {Function} fn callback
     * @api private
     */
  , getClient: function getClient(fn) {
      this.fossa.connect(this.database, this.collection, function connect(err, client) {
        if (err) return this.fossa.emit('error', err);
        fn(null, client);
      }.bind(this));
    }

    /**
     * Query the collection, local has priority of the database.
     *
     * @param {Object} query
     * @param {Object} options optional MongoDB options
     * @param {Function} fn callback
     */
  , findOne: function findOne(query, options, fn) {
      // Options are optional, callback can be passed as 2nd argument.
      if (typeof options === 'function') {
        fn = options;
        options = {};
      }

      // Check the local collection first.
      var result = this.findWhere(query);
      if (result) return process.nextTick(fn.bind(fn, null, result));

      // Check the database and specified collection after.
      this.getClient(function returnClient(err, client) {
        client.findOne(query, fn);
      });
    }

    /**
     * Insert new document(s) in the collection and persist to database.
     *
     * @param {Array} docs documents to be inserted
     * @param {Object} options
     * @param {Function} fn callback
     */
  , insert: function insert(docs, options, fn) {
      // Options are optional, callback can be passed as 2nd argument.
      if (typeof options === 'function') {
        fn = options;
        options = {};
      }

      // Add the documents to the collection
      this.add(docs);

      // Persist the documents to the database.
      if (!options.w) options.w = 1;
      this.getClient(function returnClient(err, client) {
        client.insert(docs, options, fn);
      });
    }

    /**
     * Save collection to mongoDB, writeConcern is true by default.
     * TODO: allow passing of options
     *
     * @param {Function} fn callback
     * @api public
     */
  , save: function (fn) {
      var self = this
        , options = { w: 1 }
        , stored = _.groupBy(this.models, function groupModels(model) {
            return model._stored;
          });

      // Update model, don't use upsert of update as it will query.
      // Insert if the current model hasn't been persisted yet.
      this.getClient(function returnClient(err, client) {
        /**
         * Update the _stored property of the instance.
         *
         * @param {Object} instance
         * @api private
         */
        function _stored(instance) {
          return instance._stored = true;
        }

        /**
         * Return attributes that need to be inserted.
         *
         * @param {Object} instance
         * @api private
         */
        function insert(instance) {
          return instance.attributes;
        }

        /**
         * Provide an update method for async, as each ObjectID needs to be
         * queried independently by using its previousAttributes.
         *
         * @param {Object} instance
         * @api private
         */
        function update(instance) {
          var id = instance._previousAttributes._id;
          return client.update.bind(client, { '_id': id }, instance.changed, options);
        }

        // Create a callable collection of document updates, after
        // add bluk insert to add all documents at once.
        var docs = stored.true ? stored.true.map(update) : [];
        if (stored.false) docs.push(client.insert.bind(client, stored.false.map(insert)));

        // Execute upserts parallel.
        async.parallel(docs, function syncComplete(err, result) {
          if (err) fn(err, result);

          // Update the _stored property for future reference.
          self.each(_stored);

          // Return results of the current
          fn(err, result);
        });
      });
    }
  }, new Static);
};
