'use strict';

function Virtual () {
  this.getters = [];
  this.setters = [];
}

/**
 * Defines a getter.
 *
 * @param {Function} fn
 * @return {VirtualType} this
 * @api public
 */

Virtual.prototype.get = function (fn) {
  this.getters.push(fn);
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
  this.setters.push(fn);
  return this;
};

//
// Expose the virtual method.
//
module.exports = Virtual;
