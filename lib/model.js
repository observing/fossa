'use strict';

//
// Required modules.
//
var mongo = require('mongodb');

//
// Default model definition of fossa.
//
module.exports = {
    /**
     * @type {String} proxy id attribute to MongoDB internal `_id`
     * @api private
     */
    idAttribute: "_id"

    /**
     * On model instantiation do some basic checks.
     *
     * @param {
     */
  , initialize: function initialize() {
      this.required();
    }

    /**
     * Proxy model saves to mongoDB.
     */
  , save: function () {
      console.log(this);
    }
};
