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
      var id = this.attributes._id || this.attributes.id
        , oid = id instanceof ObjectID;

      //
      // Define restricted non-enumerated properties.
      //
      this.readable('fossa', fossa);

      //
      // Set the models pertained storage state.
      //
      this._stored = !!id && oid;

      //
      // Provide an MongoDB ObjectID if not present.
      //
      if (!id || !oid) this.set('_id', new ObjectID);
    },

    /**
     * Synchronize the model to MongoDB.
     *
     * @param {String} method CRUD
     * @param {Function} done callback
     * @api public
     */
    sync: function sync(method, done) {
      if ('function' === typeof method) {
        done = method;
        method = 'create';
      }

      if (!~this.crud.indexOf(method)) return done(new Error('Method not found'));
      backbone.sync(method, this, done);
    }
  }));
};
