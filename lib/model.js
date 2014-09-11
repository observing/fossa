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
  var Model = backbone.Model.extend({
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
        , local = {}
        , stored;

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

      stored = '_id' in local && local._id instanceof ObjectID;
      if (!stored) local._id = new ObjectID;

      //
      // Define restricted non-enumerated properties.
      //
      predefine(this, fossa);

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
      backbone.Model.call(this, local, options);
      this._stored = stored;
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
     * @param {Boolean} state Stored state, always true if not false
     * @returns {Model} fluent interface.
     * @api public
     */
    stored: function stored(state) {
      this._stored = state !== false;
      return this;
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
      // If the model was stored before and has reference, use update.
      //
      if ('create' === method && model._stored) method = 'update';
      return backbone.sync(method, model, options);
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
      return !this._stored;
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

  Model.ObjectID = ObjectID;
  return Model;
};
