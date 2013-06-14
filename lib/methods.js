'use strict';

//
// Required modules.
//
var Virtual = require('./methods/virtual');

/**
 * Constructor for static methods to overload Backbone Model.
 *
 *
 */
function Methods() {
}

Methods.prototype.virtual = function virtual(key) {
  return Virtual.prototype;
};

module.exports = Methods;
