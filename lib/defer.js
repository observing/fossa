'use strict';

//
// Required modules.
//
var predefine = require('predefine');

/**
 * Defer callbacks by keeping state, only works in context of sync/update/save.
 * Prevents the need for an entire promise module.
 *
 * @constructor
 * @api private
 */
module.exports = function Defer() {
  var readable = predefine(this)
    , defer = this;

  /**
   * Called after, the provided callback is stored.
   *
   * @param {Function} fn
   * @api private
   */
  readable('done', function done(fn) {
    if (defer.stack) return fn.apply(defer, defer.stack);
    defer.then = fn;
  });

  /**
   * Called when callback is executed, if next is called before this.then is
   * configured the arguments will be stored on the stack.
   *
   * @api private
   */
  readable('next', function next() {
    if ('function' !== typeof defer.then) return defer.stack = arguments;
    defer.then.apply(defer, arguments);
  });
};
