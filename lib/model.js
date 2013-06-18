'use strict';

//
// Required modules.
//
var ObjectID = require('mongodb').ObjectID;

//
// Default model definition of fossa.
//
module.exports = {
    /**
     * @type {String} proxy id attribute to MongoDB internal `_id`
     * @api private
     */
    idAttribute: '_id'

    /**
     * On model instantiation set basics and do some checks.
     *
     * @Constructor
     * @api public
     */
  , initialize: function initialize() {
      var id = this.attributes._id;

      // Set the models pertained storage state.
      this._stored = !!id;

      // Provide an MongoDB ObjectID if not present.
      if (!id) this.set('_id', new ObjectID);
    }
};
