'use strict';

//
// Required modules.
//
var _ = require('lodash')
  , async = require('async')
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
     * @api private
     */
    constructor: function constructor() {
      //
      // Define restricted non-enumerated properties.
      //
      predefine(this, fossa);

      //
      // Call original Backbone Model constructor.
      //
      backbone.Collection.apply(this, arguments);
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
     * Synchronize the model to MongoDB.
     *
     * @param {String} method CRUD
     * @param {Model} model reference to self
     * @param {Object} options
     * @api public
     */
    sync: function sync(method, collection, options) {
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

      //
      // Remove Backbone properties from options, not required for MongoDB.
      //
      if ('object' === typeof options) Object.keys(options).forEach(function remove(key) {
        if (~collection._native.indexOf(key)) delete options[key];
      });

      return backbone.sync(method, collection, options);
    }
  });
};
