'use strict';

//
// Required modules.
//
var ObjectID = require('mongodb').ObjectID
  , backbone = require('backbone')
  , predefine = require('./predefine')
  , Defer = require('./defer');

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
      var hooks = []
        , local = {};

      options = options || {};

      //
      // Set the database name and/or urlRoot if provided in the options.
      //
      if (options.database) this.database = options.database;
      if (options.urlRoot) this.urlRoot = options.urlRoot;

      //
      // Copy attributes to a new object and provide a MongoDB OfbjectID.
      //
      attributes = attributes || {};
      for (var key in attributes) local[key] = attributes[key];

      //
      // If the provided `_id` is an ObjectID assume the model is stored.
      // If it is not an ObjectID, remove it from the provided data.
      // MongoDB will provide an ObjectID by default.
      //
      if ('_id' in local) try {
        local._id = new ObjectID(local._id);
      } catch (error) { delete local._id; }

      //
      // Define restricted non-enumerated properties.
      //
      predefine(this, fossa);

      //
      // Check for presence of before/after hooks and setup.
      //
      if (this.before) hooks.push('before');
      if (this.after) hooks.push('after');
      this.setup(hooks);

      //
      // Call original Backbone Model constructor.
      //
      backbone.Model.call(this, local, options);
    },

    /**
     * Clone this Model.
     *
     * @returns {Model}
     * @api public
     */
    clone: function clone() {
      return new this.constructor(this.attributes, {
        urlRoot: this.urlRoot,
        database: this.database
      });
    },

    /**
     * Update the _stored property.
     *
     * @param {ObjectId} id ObjectId reference in MongoDB
     * @returns {Model} fluent interface.
     * @api public
     */
    stored: function stored(id) {
      this.id = this.attributes._id = id;
      return this;
    },

    /**
     * Synchronize the model to MongoDB.
     *
     * @param {String} method CRUD
     * @param {Model} model reference to self
     * @param {Object} options Optional Backbone.JS and MongoDB options.
     * @param {Object} query Optional MongoDB query.
     * @returns {XHR} Promise style success and error callbacks.
     * @api public
     */
    sync: function sync(method, model, options, query) {
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
      // If the model was stored before and has reference, use update.
      //
      if ('create' === method && model.id) method = 'update';
      return backbone.sync(method, model, options, query);
    },

    /**
     * Overrule the default save. Normally `save` returns `false` when validation
     * fails. However this does not match the Node.JS callback pattern.
     *
     * @return {Defer} Promise XHR object
     * @api public
     */
    save: function save() {
      var defer = new Defer
        , xhr = backbone.Model.prototype.save.apply(this, arguments);

      if (xhr) return xhr;
      defer.next(new Error('Could not validate model'));

      return defer;
    },

    /**
     * Altered check for isNew, since the id attribute is mapped to ObjectID.
     *
     * @returns {Boolean}
     * @api public
     */
    isNew: function isNew() {
      return !this.id;
    },

    /**
     * Override the default url functionality, MongoDB stores models in
     * instances named after the collections, not a combination of the
     * collection name and ObjectId.
     *
     * @returns {String} Collection reference.
     * @api public
       */
    url: function url() {
      return this.urlRoot;
    }
  });
};
