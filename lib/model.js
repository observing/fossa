'use strict';

//
// Required modules.
//
var ObjectID = require('mongodb').ObjectID
  , backbone = require('backbone')
  , predefine = require('./predefine');

/**
 * Setup a default model definition for fossa.
 *
 * @param {Fossa} fossa instance
 * @api public
 */
module.exports = function model(fossa) {
  return predefine(backbone.Model.extend({
    /**
     * @type {String} proxy id attribute to MongoDB internal `_id`
     * @api private
     */
    idAttribute: '_id',

    /**
     * On model instantiation set model ID and stored attribute after doing checks.
     *
     * @Constructor
     * @param {Object} options
     * @api public
     */
    initialize: function initialize() {
      var id = this.attributes._id
        , oid = id instanceof ObjectID;

      //
      // Define restricted non-enumerated properties.
      //
      this.readable('fossa', fossa);

      //
      // If the ObjectID is changed, refresh stored reference.
      //
      this.on('change:_id', function refresh() {
        this._stored = false;
      });

      //
      // Provide an MongoDB ObjectID if not present.
      //
      if (!id || !oid) this.set('_id', new ObjectID);
    },

    /**
     * Synchronize the model to MongoDB.
     *
     * @param {String} method CRUD
     * @param {Model} model reference to self
     * @param {Object} options
     * @api public
     */
    sync: function sync(method, model, options) {
      //
      // Method and or model was not provided, set default arguments.
      // Additionally default to CREATE if the method is not a string.
      //
      if (!(model instanceof backbone.Model)) {
        if ('string' !== typeof method) {
          options = method;
          method = 'create';
        } else {
          options = model;
        }

        model = this;
      }

      //
      // Remove Backbone properties from options, not required for MongoDB.
      //
      if ('object' === typeof options) Object.keys(options).forEach(function remove(key) {
        if (~model.native.indexOf(key)) delete options[key];
      });

      //
      // If the model was stored before and has reference, use update.
      //
      if ('create' === method && model._stored) method = 'update';
      return backbone.sync(method, model, options);
    },

    /**
     * Altered check for isNew, since the id attribute is mapped to ObjectID.
     *
     * @returns {Boolean}
     * @api public
     */
    isNew: function isNew() {
      return !this._stored;
    }
  }));
};
