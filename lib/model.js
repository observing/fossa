'use strict';

//
// Required modules.
//
var ObjectID = require('mongodb').ObjectID
  , Backbone = require('backbone');

//
// Default model definition of fossa.
//
module.exports = Backbone.Model.extend({
  /**
   * @type {String} proxy id attribute to MongoDB internal `_id`
   * @api private
   */
  idAttribute: '_id',

  /**
   * On model instantiation set model ID and stored attribute after doing checks.
   *
   * @Constructor
   * @api public
   */
  initialize: function initialize() {
    var id = this.attributes._id
      , oid = id instanceof ObjectID;

    // Set the models pertained storage state.
    this._stored = !!id && oid;

    // Provide an MongoDB ObjectID if not present.
    if (!id || !oid) this.set('_id', new ObjectID);
  }
});
