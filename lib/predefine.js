'use strict';

//
// Required modules.
//
var predefine = require('predefine');

/**
 *
 */
module.exports = function predefined(Base) {
  Base.writable = predefine(Base.prototype, predefine.WRITABLE);
  Base.readable = predefine(Base.prototype);

  //
  // Define restricted non-enumerated properties.
  //
  Base.writable('database', '');

  /**
   * Proxy method to change the database used to store the collection.
   *
   * @param {String} database name
   * @return {Collection|Model} fluent interface
   * @api public
   */
  Base.readable('use', function use(database) {
    return (this.database = database) && this;
  });

  /**
   * Get the client against the database and collection.
   *
   * @param {Function} fn callback
   * @api private
   */
  Base.readable('getClient', function getClient(fn) {
    this.fossa.connect(this.database, this.urlRoot || this.name, fn);
  });

  /**
   * Synchronize the model to MongoDB.
   *
   * @param {String} method CRUD
   * @param {Object} model instance
   * @param {Object} options
   * @api public
   */
  Base.readable('sync', function sync(method, model, options) {
    if ('function' === typeof method) {
      options = { success: method, error: method };
      method = 'create';
      model = this;
    } else if ('object' === typeof method) {
      method = 'create';
      model = this;
    }

    method = method || 'create';

    switch (method) {
      case 'create':
      break;

      case 'update':
      break;

      case 'delete':
      break;

      case 'read':
      break;
    }
  });

  return Base;
};
