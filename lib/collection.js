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
     * Proxy model saves to mongoDB, writeConcern is true by default.
     *
     * @param {Function} fn callback
     * @api public
     */
  , sync: function (fn) {
      var self = this
        , fossa = this.fossa
        , database = this.database
        , collection = this.collection
        , options = { w: 1 }
        , stored = _.groupBy(this.models, function groupModels(model) {
            return model._stored;
          });

      // Update model, don't use upsert of update as it will query.
      // Insert if the current model hasn't been persisted yet.
      fossa.connect(function getConnection(err, client) {
        if (err) fn(err);

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

        // Set the correct database and collection, after execute upserts parallel.
        client = client.db(database).collection(collection);
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
