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
  return backbone.Model.extend({
    /**
     * @type {String} proxy id attribute to MongoDB internal `_id`
     * @api private
     */
    idAttribute: '_id',

    /**
     * Override default Model Constructor.
     *
     * @Constructor
     * @param {Object} attributes
     * @param {Object} options
     * @api public
     */
    constructor: function constructor(attributes, options) {
      var hooks = [];
      options = options || {};

      //
      // Define restricted non-enumerated properties.
      //
      predefine(this, fossa);

      //
      // Provide an MongoDB ObjectID if not present.
      //
      attributes = attributes || {};
      var stored = '_id' in attributes && attributes._id instanceof ObjectID;
      if (!('_id' in attributes) || !(attributes._id instanceof ObjectID)) {
        attributes._id = new ObjectID;
      }

      //
      // Set the database name if it was provided in the options.
      //
      if (options.database) this._database = options.database;

      //
      // If the ObjectID is changed, refresh stored reference.
      //
      this.on('change:_id', function refresh() {
        this._stored = false;
      });

      //
      // Check for presence of before/after hooks and setup.
      //
      if (this.before) hooks.push('before');
      if (this.after) hooks.push('after');
      this.setup(hooks);

      //
      // Call original Backbone Model constructor.
      //
      backbone.Model.call(this, attributes, options);
      this._stored = stored;
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
        if (~model._native.indexOf(key)) delete options[key];
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
  });
};
