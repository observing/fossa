'use strict';

//
// Required modules.
//
var _ = require('lodash')
  , async = require('async')
  , backbone = require('backbone')
  , predefine = require('./predefine');

/**
 * Default collection definition of fossa.
 *
 * @param {Fossa} fossa instance for use of connected client.
 * @api public
 */
module.exports = function collection(fossa) {
  return predefine(backbone.Collection.extend({
    /**
     * @type {Model} Default model.
     * @api private
     */
    model: fossa.Model,

    /**
     * Find a model by ObjectID.
     *
     * @param {ObjectID} id
     * @returns {Model}
     * @api public
     */
    id: function id(objectId) {
      return this.findWhere({ _id: objectId });
    },

    /**
     * Override default Collection Constructor.
     *
     * @api private
     */
    constructor: function constructor() {
      //
      // Define restricted non-enumerated properties.
      //
      this.readable('fossa', fossa);
      backbone.Collection.apply(this, arguments);
    }
  }));
};
