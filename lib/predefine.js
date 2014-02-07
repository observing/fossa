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
  writable('_database', '');
  readable('_crud', ['create', 'read', 'update', 'delete', 'patch']);
  readable('_native', ['success', 'parse', 'error']);

  /**
   * Proxy method to change the database used to store the collection.
   *
   * @param {String} database name
   * @return {Collection|Model} fluent interface
   * @api public
   */
  readable('use', function use(database) {
    return (this._database = database) && this;
  });

  /**
   * Get the client against the database and collection.
   *
   * @param {Function} done callback
   * @api private
   */
  readable('client', function client(done) {
    this.fossa.connect(this._database, this.urlRoot || this.url, done);
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
   * @param {Array} hooks keys to use
   * @api private
   */
  readable('setup', function setup(hooks) {
    var actions = {}
      , model = this;

    /**
     * Iterator to execute items on the stack (a)synchronously.
     *
     * @param {Object} item properties, e.g. function to call and attribute key
     * @param {Function} next callback
     * @returns {Mixed}
     * @api private
     */
    function execute(item, next) {
      if ('function' !== typeof item.fn) item.fn = model[item.fn];
      return item.fn.call(model, model.get(item.value), next);
    }

    //
    // Loop over the hooks added to the model, e.g. before and after.
    //
    hooks.forEach(function each(hook) {
      var source = model[hook]
        , on, attrib, targets;

      for (var key in source) {
        targets = key.split(' ');
        on = targets[0];
        attrib = targets[1];

        //
        // Only add actions for allowed hooks.
        //
        if (!~model._crud.indexOf(on) && 'validate' !== on) continue;
        actions[on] = actions[on] || { before: [], after: [] };
        actions[on][hook].push({
          fn: source[key],
          value: attrib
        });
      }

      //
      // Prepare parallel async for each register attribute hook.
      //
      Object.keys(actions).forEach(function register(action) {
        if ('validate' === action) return;

        //
        // Register trigger for each hook stack.
        //
        Object.keys(actions[action]).forEach(function add(hook) {
          if (!actions[action][hook].length) return;

          model.on(hook + ':' + action, function trigger(done) {
            async.each(actions[action][hook], execute, done);
          });
        });
      });
    });

    //
    // Overload the provided validat and add the before and after hooks.
    //
    if (!model.validate || !actions.validate) return;

    //
    // Store the validate provided to the model and get the validate hook stack.
    //
    var validator = model.validate
      , stack = actions.validate
      , i;

    /**
     * Proxy method for the provided validate function.
     *
     * @param {Object} attributes
     * @param {Object} options
     * @api private.
     */
    model.validate = function validate(attributes, options) {
      stack.before.forEach(execute);
      var result = validator.call(model, model.attributes, options);
      stack.after.forEach(execute);

      return result;
    };
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
          if (results) model._stored = true;
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
  if (!~model._crud.indexOf(method)) return defer.next(
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
  if (model._events && 'before:' + method in model._events) stack.unshift(before);
  if (model._events && 'after:' + method in model._events) stack.push(after);

  async.waterfall(stack, defer.next);
  return defer;
};
