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

//
// findWhere should not call the overwritten where, proxy to prototype.
//
Backbone.Collection.prototype.findWhere = function findWhere(attrs) {
  return Backbone.Collection.prototype.where.call(this, attrs, true);
};

/**
 * Default model definition of fossa.
 *
 * Options:
 *   - database {String} Database name.
 *
 * @param {Fossa} fossa instance for use of connected client.
 * @param {Object} options
 * @api public
 */
module.exports = function collection(fossa, options) {
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
      if (!this.name) return fossa.emit('error', new Error(
        'Please specify a collection name by using the `name` key'
      ));
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
     * @api privat
     */
  , getClient: function getClient(fn) {
      fossa.connect(this.database, this.name, function connect(err, client) {
        if (err) return fossa.emit('error', err);
        fn(null, client);
      }.bind(this));
    }

    /**
     * Find a model by id.
     *
     * @param {ObjectID} id
     * @param {Function} fn callback
     * @return {Collection} this
     * @api public
     */
  , id: function id(objectId, fn) {
      this.findWhere({ _id: objectId }, fn);
      return this;
    }

    /**
     * Query the collection for models, local has priority over the database.
     *
     * @param {Object} query
     * @param {Object} options optional MongoDB options
     * @param {Function} fn callback
     * @return {Collection} this
     * @api public
     */
  , where: function where(query, options, fn) {
      options = (fn = fn || options) && typeof options !== 'object' ? {} : options;

      // Check the local collection first.
      var result = Backbone.Collection.prototype.where.call(this, query);
      if (result) return process.nextTick(fn.bind(fn, null, result));

      // Check the database and specified collection after.
      this.getClient(function returnClient(err, client) {
        client.find(query, fn);
      });

      return this;
    }

    /**
     * Query the collection for one model, local has priority over the database.
     *
     * @param {Object} query
     * @param {Object} options optional MongoDB options
     * @param {Function} fn callback
     * @return {Collection} this
     * @api public
     */
  , findWhere: function findWhere(query, options, fn) {
      options = (fn = fn || options) && typeof options !== 'object' ? {} : options;

      // Check the local collection first.
      var result = Backbone.Collection.prototype.findWhere.call(this, query);
      if (result) return process.nextTick(fn.bind(fn, null, result));

      // Check the database and specified collection after.
      this.getClient(function returnClient(err, client) {
        client.findOne(query, fn);
      });

      return this;
    }

    /**
     * Add new document(s) in the collection and persist to database. Data will
     * only be persisted if you supply a callback.
     *
     * @param {Array} docs documents to be inserted
     * @param {Object} options optional
     * @param {Function} fn optional callback
     * @return {Collection} this
     * @api public
     */
  , add: function add(docs, options, fn) {
      options = (fn = fn || options) && typeof options !== 'object' ? {} : options;

      // Add the documents to the collection
      Backbone.Collection.prototype.add.call(this, docs);

      // Persist the documents to the database.
      if (fn) {
        if (!('w' in options)) options.w = 1;
        this.getClient(function returnClient(err, client) {
          client.insert(docs, options, fn);
        });
      }

      return this;
    }

    /**
     * Change models attributes by query.
     *
     * @param {String} type set, unset or push
     * @param {Object} query
     * @param {Object} docs updated object
     * @param {Object} options
     * @param {Function} fn callback
     * @api public
     */
  , update: function push(type, query, docs, options, fn) {
      options = (fn = fn || options) && typeof options !== 'object' ? {} : options;

      // Get the model from the collection or database.
      this.set(docs);

      // Persist the documents to the database.
      if (!('w' in options)) options.w = 1;
      this.getClient(function returnClient(err, client) {
        var update = {};
        update['$' + type] = docs;

        client.update(query, update, options, fn);
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
          return client.update.bind(client, { _id: id }, model.changed, options);
        }

        // Create a callable collection of document updates, after
        // add bluk insert to add all documents at once.
        var docs = stored.true ? stored.true.map(update) : [];
        if (stored.false) docs.push(client.insert.bind(client, stored.false.map(insert)));

        // Execute upserts parallel.
        async.parallel(docs, function asyncSaveComplete(err, result) {
          if (err) fn(err, null);

          // Update the _stored property for future reference.
          self.each(_stored);

          // Return flattened results of save action.
          fn(err, _.flatten(result));
        });
      });
    }
  }, new Static);
};
