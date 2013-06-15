'use strict';

//
// Required modules.
//
var mongo = require('mongodb')
  , ObjectID = mongo.ObjectID;

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
     * On model instantiation do some basic checks.
     *
     * @param {
     * @api public
     */
  , initialize: function initialize() {
      if (!this.attributes._id) this.set('_id', new ObjectID);
    }

    /**
     * Proxy model saves to mongoDB.
     *
     * @param {Function} fn callback
     * @api public
     */
  , save: function (fn) {
      console.log(this);
      fn();
    }
};
