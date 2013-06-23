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
  // Add push method to Child prototype;
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
     * Query the collection for models, local has priority over the database.
     *
     * @param {Object} query
     * @param {Object} options optional MongoDB options
     * @param {Function} fn callback
     */
  , find: function find(query, options, fn) {
      options = (fn = fn || options) && typeof options !== 'object' ? {} : options;

      // Check the local collection first.
      var result = this.where(query);
      if (result) return process.nextTick(fn.bind(fn, null, result));

      // Check the database and specified collection after.
      this.getClient(function returnClient(err, client) {
        client.find(query, fn);
      });
    }

    /**
     * Query the collection for one model, local has priority over the database.
     *
     * @param {Object} query
     * @param {Object} options optional MongoDB options
     * @param {Function} fn callback
     */
  , findOne: function findOne(query, options, fn) {
      options = (fn = fn || options) && typeof options !== 'object' ? {} : options;

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
      options = (fn = fn || options) && typeof options !== 'object' ? {} : options;

      // Add the documents to the collection
      this.add(docs);

      // Persist the documents to the database.
      if (!('w' in options)) options.w = 1;
      this.getClient(function returnClient(err, client) {
        client.insert(docs, options, fn);
      });
    }

    /**
     * Update (sub)documents in the collection
     *
     * @param {Object} query
     * @param {Array} docs altered object, changes will be mitigated
     * @param {Object} options
     * @param {Function} fn callback
     */
  , set: function set(query, docs, options, fn) {
      options = (fn = fn || options) && typeof options !== 'object' ? {} : options;
      var self = this
        , calls = {};

      // Get the model from the collection or database.
      this.find(query, function found(models) {
        models.set(docs, { add:false, remove: false });

        // Persist the documents to the database.
        if (!('w' in options)) options.w = 1;
        this.getClient(function returnClient(err, client) {
          // Loop each model independantly, since MongoDB can only do one
          // specific update per run, which is quite logical.
          _.each(models, function createCallstack(model) {
            var id = model.id;

            calls[id] = client.update.bind(
                client
              , { '_id': id }
              , { '$set': model.changed }
              , options
            );
          });

          // Store the results in the database.
          async.parallel(calls, fn);
        });
      });
    }

  , unset: function unset(query, docs, options, fn) {
      // implement, opposite of set, removes attributes from models.
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
         * Update the _stored property of the model.
         *
         * @param {Object} model
         * @api private
         */
        function _stored(model) {
          return model._stored = true;
        }

        /**
         * Return attributes that need to be inserted.
         *
         * @param {Object} model
         * @api private
         */
        function insert(model) {
          return model.attributes;
        }

        /**
         * Provide an update method for async, as each ObjectID needs to be
         * queried independently by using its previousAttributes.
         *
         * @param {Object} model
         * @api private
         */
        function update(model) {
          var id = model._previousAttributes._id;
          return client.update.bind(client, { '_id': id }, model.changed, options);
        }

        // Create a callable collection of document updates, after
        // add bluk insert to add all documents at once.
        var docs = stored.true ? stored.true.map(update) : [];
        if (stored.false) docs.push(client.insert.bind(client, stored.false.map(insert)));

        // Execute upserts parallel.
        async.parallel(docs, function asyncSaveComplete(err, result) {
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
