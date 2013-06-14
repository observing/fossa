'use strict';

function Virtual () {
}

/**
 * Defines a virtual getter.
 *
 * @param {Function} fn
 * @return {Virtual} this
 * @api public
 */

Virtual.prototype.get = function (fn) {
  return this;
};

/**
 * Defines a virtual setter.
 *
 * @param {Function} fn
 * @return {Virtual} this
 * @api public
 */

Virtual.prototype.set = function (fn) {
  return this;
};

//
// Expose the virtual method.
//
module.exports = Virtual;
