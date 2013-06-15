'use strict';

//
// Required modules.
//
var Virtual = require('./methods/virtual');

/**
 * Constructor for static methods to overload Backbone Model.
 *
 * @Constructor
 * @param {Object} options
 * @api public
 */
function Methods(options) {
//  this.collection = options.collection;
}

Methods.prototype.virtual = function virtual(key) {
  return new Virtual;
};

module.exports = Methods;
