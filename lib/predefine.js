'use strict';

//
// Required modules.
//
var predefine = require('predefine')
  , backbone = require('backbone');

//
// Allowed CRUD methods.
//

/**
 *
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
  readable('crud', ['create', 'read', 'update', 'delete']);

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
 * @param {Function} done callback
 */
backbone.sync = function sync(method, model, done) {
  model.client(function getClient(error, client) {
    if (error) return done(error);

    switch (method) {
      case 'create':
        client.insert(model.attributes, function inserted(error, results) {
          if (error) return done(error);

          //
          // Update the _stored property for future reference.
          //
          stored(model);
          done(null, model);
        });
      break;

      case 'read':
      break;

      case 'update':
      break;

      case 'delete':
      break;
    }
  });
};
