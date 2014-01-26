'use strict';

//
// Required modules.
//
var predefine = require('predefine')
  , backbone = require('backbone')
  , async = require('async')
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
  // Define restricted non-enumerated CRUD property and database.
  //
  writable('database', '');
  readable('crud', ['create', 'read', 'update', 'delete', 'patch']);
  readable('native', ['success', 'parse', 'error']);
  readable('hooks', ['save', 'validate', 'remove', 'fetch']);

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

  /**
   * Helper to set properties on model, e.g. other than attributes.
   *
   * @param {String} property key
   * @param {Mixed} value
   * @return {Collection|Model} fluent interface
   * @api public
   */
  readable('define', function define(property, value) {
    return (this[property] = value) && this;
  });

  /**
   * Setup all before and after hooks.
   *
   * @param {String} hook before or after hook
   * @api private
   */
  readable('setup', function setup(hook) {
    var actions = {}
      , model = this
      , source = model[hook]
      , on, attrib;

    function apply(fn, attribute) {
      return function execute(next) {
        model[fn].call(model, attribute, next);
      };
    }

    for (var key in source) {
      key = key.split(' ');
      on = key[0];
      attrib = key[1];

      //
      // Only add actions for allowed hooks.
      //
      if (!~this.hooks.indexOf(key)) continue;
      actions[on] = actions[on] || [];
      actions[on].push(
        apply(source[key], this.get(attrib))
      );
    }

    //
    // Prepare parallel async for each register attribute hook.
    //
    function initiate(stack, done) {
      return async.each(stack, done);
    }

    for (var action in actions) {
      this.on(hook + ':' + action, initiate(actions[action]));
    }
  });

  return Base;
};

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

  //
  // Safe mode is on by default if not fetching.
  //
  options = options || {};
  if (method !== 'read') options.w = 'w' in options ? options.w : 1;

  //
  // Get the client
  //
  model.client(function getClient(error, client) {
    if (error) return defer.next(error);

    switch (method) {
      case 'create':
        client.insert(model.attributes, options, function inserted(error, results) {
          if (error) return defer.next(error);

          //
          // Update the _stored property for future reference.
          //
          model._stored = true;
          defer.next(null, results);
        });
      break;

      case 'read':
        //
        // Model not saved before, return early.
        //
        if (model.isNew()) return defer.next(null, null);

        client.findOne({ _id: model.id }, options, function found(error, results) {
          if (error) return defer.next(error);

          //
          // Merge the results of the read operation in the current model.
          //
          model.set(results);
          defer.next(null, results);
        });
      break;

      case 'update':
      case 'patch':
        var update = { $set: model.changed };
        if (options.upsert) update = model.attributes;

        client.update({ _id: model.id }, update, options, function updated(error, results) {
          if (error) return defer.next(error);

          //
          // Update the _stored property for future reference.
          //
          model._stored = true;
          defer.next(null, results);
        });
      break;

      case 'delete':
        client.remove({ _id: model.id }, options, function updated(error, results) {
          if (error) return defer.next(error);

          //
          // Update the _stored property for future reference.
          //
          model._stored = false;
          defer.next(null, results);
        });
      break;
    }
  });

  return defer;
};
