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
      // Provide an MongoDB ObjectID if not present.
      if (!this.attributes._id) this.set('_id', new ObjectID);

      // Set the models pertained storage state.
      // TODO change to true if read from the dbase
      this._stored = false;
    }
};
