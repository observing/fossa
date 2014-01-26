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
      , on, attrib, targets;

    for (var key in source) {
      targets = key.split(' ');
      on = targets[0];
      attrib = targets[1];

      //
      // Only add actions for allowed hooks.
      //
      if (!~this.crud.indexOf(on) && on !== 'validate') continue;
      actions[on] = actions[on] || [];
      actions[on].push({
        fn: source[key],
        value: this.get(attrib)
      });
    }

    //
    // Prepare parallel async for each register attribute hook.
    //
    Object.keys(actions).forEach(function register(action) {
      model.on(hook + ':' + action, function trigger(done) {
        async.each(actions[action], function execute(item, next) {
          return model[item.fn].call(model, item.value, next);
        }, done);
      });
    });
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
  var defer = new Defer
    , stack;

  /**
   * Trigger execution of before hooks.
   *
   * @param {Function} next callback
   * @api private
   */
  function before(next) {
    model.trigger('before:' + method, next);
  }

  /**
   * Get the Fossa client from the model.
   *
   * @param {Function} next callback
   * @api private
   */
  function getClient(next) {
    model.client(next);
  }

  /**
   * Persist model data to MongoDB.
   *
   * @param {Object} client Fossa MongoDB client
   * @param {Function} next callback
   * @api private
   */
  function persist(client, next) {
    switch (method) {
      case 'create':
        client.insert(model.attributes, options, function inserted(error, results) {
          if (error) return next(error);

          //
          // Update the _stored property for future reference.
          //
          model._stored = true;
          next(null, results);
        });
      break;

      case 'read':
        //
        // Model not saved before, return early.
        //
        if (model.isNew()) return next(null, null);

        client.findOne({ _id: model.id }, options, function found(error, results) {
          if (error) return next(error);

          //
          // Merge the results of the read operation in the current model.
          //
          model.set(results);
          next(null, results);
        });
      break;

      case 'update':
      case 'patch':
        var update = { $set: model.changed };
        if (options.upsert) update = model.attributes;

        client.update({ _id: model.id }, update, options, function updated(error, results) {
          if (error) return next(error);

          //
          // Update the _stored property for future reference.
          //
          model._stored = true;
          next(null, results);
        });
      break;

      case 'delete':
        client.remove({ _id: model.id }, options, function updated(error, results) {
          if (error) return next(error);

          //
          // Update the _stored property for future reference.
          //
          model._stored = false;
          next(null, results);
        });
      break;
    }
  }

  /**
   * Trigger execution of after hooks, pass results from the peristence to keep
   * it consistent with the callback of persistance if no after hooks are provided.
   *
   * @param {Object} results of persistence
   * @param {Function} next callback
   * @api private
   */
  function after(results, next) {
    model.trigger('after:' + method, function done(error) {
      next(error, results);
    });
  }

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
  // Setup stack, always get the client and persist the data.
  // Check if before:emit needs to be added to the stack.
  // Check if after:emit needs to be added to the stack.
  //
  stack = [getClient, persist];
  if (model.before && Object.keys(model.before).length) stack.unshift(before);
  if (model.after && Object.keys(model.after).length) stack.push(after);

  async.waterfall(stack, defer.next);
  return defer;
};
