'use strict';

//
// Required modules.
//
var predefine = require('predefine')
  , backbone = require('backbone')
  , Defer = require('./defer');

/**
 * Define base functions for both models as well as collections.
 *
 * @param {Object} Base model of collection object definition
 * @returns {Object} extended base
 * @api public
 */
module.exports = function predefined(Base) {
  var writable = predefine(Base.prototype, predefine.WRITABLE)
    , readable = predefine(Base.prototype);

  readable('readable', readable);
  readable('writable', writable);

  //
  // Define restricted non-enumerated properties.
  //
  writable('database', '');
  readable('crud', ['create', 'read', 'update', 'delete', 'patch']);

  /**
   * Proxy method to change the database used to store the collection.
   *
   * @param {String} database name
   * @return {Collection|Model} fluent interface
   * @api public
   */
  readable('use', function use(database) {
    return (this.database = database) && this;
  });

  /**
   * Get the client against the database and collection.
   *
   * @param {Function} done callback
   * @api private
   */
  readable('client', function client(done) {
    this.fossa.connect(this.database, this.urlRoot || this.name, done);
  });

  return Base;
};

/**
 * Update the _stored property of the model.
 *
 * @param {Object} model
 * @api private
 */
function stored(model) {
  return model._stored = true;
}

/**
 * Overwrite the default backbone sync behavior.
 *
 * @param {String} method CRUD
 * @param {Collection|Model} model instance
 * @param {Object}  callback
 */
backbone.sync = function sync(method, model, options) {
  var defer = new Defer;

  //
  // Provided method is not allowed, return early.
  //
  if (!~model.crud.indexOf(method)) return defer.next(
    new Error('Method not found')
  );

  options = options || {};
  model.client(function getClient(error, client) {
    if (error) return defer.next(error);

    switch (method) {
      case 'create':
        client.insert(model.attributes, options, function inserted(error, results) {
          if (error) return defer.next(error);

          //
          // Update the _stored property for future reference.
          //
          stored(model);
          defer.next(null, results);
        });
      break;

      case 'read':
      break;

      case 'update':
        var update = { $set: model.changed };
        if (options.upsert) update = model.attributes;

        client.update({ _id: model.id }, update, options, defer.next);
      break;

      case 'delete':
      break;
    }
  });

  return defer;
};