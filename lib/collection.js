'use strict';

//
// Required modules.
//
var async = require('async')
  , backbone = require('backbone')
  , predefine = require('./predefine');

/**
 * Default collection definition of fossa.
 *
 * @param {Fossa} fossa instance for use of connected client.
 * @api public
 */
module.exports = function collection(fossa) {
  return backbone.Collection.extend({
    /**
     * @type {Model} Default model.
     * @api private
     */
    model: fossa.Model,

    /**
     * Override default Collection Constructor.
     *
     * @param {Array} models
     * @param {Object} options
     * @api private
     */
    constructor: function constructor(models, options) {
      if (!Array.isArray(models)) {
        options = models;
        models = [];
      }

      options = options || {};

      //
      // Set the database name if it was provided in the options.
      //
      if (options.url) this.url = options.url;
      if (options.database) this.database = options.database;

      //
      // Define restricted non-enumerated properties.
      //
      predefine(this, fossa);

      //
      // Call original Backbone Model constructor.
      //
      backbone.Collection.call(this, models, options);
    },

    /**
     * Find a model by ObjectID.
     *
     * @param {ObjectID} id
     * @returns {Model}
     * @api public
     */
    id: function id(objectId) {
      return this.findWhere({ _id: objectId });
    },

    /**
     * Clone this Collection.
     *
     * @returns {Collection}
     * @api public
     */
    clone: function clone() {
      return new this.constructor(this.models, {
        url: 'function' === typeof this.url ? this.url() : this.url,
        model: this.model,
        database: this.database,
        comparator: this.comparator
      });
    },

    /**
     * Getter that returns reference to the native MongoDB Collection.
     *
     * @returns {Collection} MongoDB native Collection
     * @api public
     */
    get plain() {
      if (!this.database || !this.url) return false;
      return this.fossa.mongoclient.db(this.database).collection(this.url);
    },

    /**
     * Synchronize the model to MongoDB.
     *
     * @param {String} method CRUD
     * @param {Collection} collection reference to self
     * @param {Object} options Optional Backbone.JS and MongoDB options.
     * @param {Object} query Optional MongoDB query.
     * @api public
     */
    sync: function sync(method, collection, options, query) {
      //
      // Method and or collection was not provided, set default arguments.
      // Additionally default to CREATE if the method is not a string.
      //
      if (!(collection instanceof backbone.Collection)) {
        if ('string' !== typeof method) {
          options = method;
          method = 'create';
        } else {
          options = collection;
        }

        collection = this;
      }

      options = options || {};

      if ('create' === method) {
        if (collection.any(function anyStored(model) { return model.stored; })) method = 'update';
        if (collection.any(function anyNew(model) { return !model.stored; })) options.upsert = true;
      }

      return backbone.sync(method, collection, options, query);
    }
  });
};
