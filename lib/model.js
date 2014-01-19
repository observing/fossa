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
      // Provide an MongoDB ObjectID if not present.
      //
      if (!id || !oid) this.set('_id', new ObjectID);
    },

    /**
     * Synchronize the model to MongoDB.
     *
     * @param {String} method CRUD
     * @param {Object} options
     * @api public
     */
    sync: function sync(method, options) {
      //
      // method was not provided, set default arguments.
      //
      if ('object' === typeof method) {
        options = method;
        method = 'create';
      }

      //
      // Default to method CREATE if not set, additionally If the model
      // was stored before and has reference, use update.
      //
      method = method || 'create';
      if ('create' === method && this._stored) method = 'update';

      return backbone.sync(method, this, options);
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
