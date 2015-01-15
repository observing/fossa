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
 * @param {Fossa} fossa instance of Fossa
 * @returns {Object} extended base
 * @api public
 */
module.exports = function predefined(Base, fossa) {
  var writable = predefine(Base, predefine.WRITABLE)
    , readable = predefine(Base);

  readable('readable', readable);
  readable('writable', writable);

  //
  // Define restricted non-enumerated CRUD property and database.
  //
  readable('fossa', fossa);
  readable('_crud', ['create', 'read', 'update', 'delete', 'patch']);
  readable('_native', ['success', 'parse', 'error']);

  /**
   * Fetch a model from the database
   *
   * @param {Object} query Optional MongoDB query.
   * @param {Object} options Optional Backbone.JS and MongoDB options.
   * @returns {XHR} Promise style success and error callbacks.
   * @api public
   */
  readable('fetch', function fetch(query, options) {
    options = options || {};
    if (options.parse === void 0) options.parse = true;

    var entity = this
      , model = entity instanceof backbone.Model
      , success = options.success
      , error = options.error;

    options.success = function(resp) {
      if (model) {
        if (!entity.set(entity.parse(resp, options), options)) return false;
      } else {
        entity[options.reset ? 'reset' : 'set'](resp, options);
      }

      if (success) success(entity, resp, options);
      entity.trigger('sync', entity, resp, options);
    };

    options.error = function(resp) {
      if (error) error(entity, resp, options);
      entity.trigger('error', entity, resp, options);
    };

    return this.sync('read', this, options, query);
  })

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
    var url = this.urlRoot;
    if (!url) url = 'function' === typeof this.url ? this.url() : this.url;

    this.fossa.connect(this.database, url, done);
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
     * Iterator to execute items on the stack (a)synchronously. Check if a
     * function was provided directly to the hook or if it has a reference
     * to a function property on the model itself. Returning a value will
     * store the property on the model automatically.
     *
     * @param {Object} item properties, e.g. function to call and attribute key
     * @param {Function} next callback
     * @returns {Mixed}
     * @api private
     */
    function execute(item, next) {
      if ('function' !== typeof item.fn) item.fn = model[item.fn];
      return item.fn.call(model, model.get(item.value), function (error, value) {
        if (error) return next(error);

        //
        // Only store the value if it is returned directly from the hook.
        //
        if (value) model.set(item.value, value);
        next();
      });
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

//
// Replace the default backbone extend functionality with the improved
// extendable pattern. This will ensure ES5 getters and setters work.
//
backbone.Collection.extend = backbone.Model.extend = require('extendible');

/**
 * Overwrite the default backbone sync behavior.
 *
 * @param {String} method CRUD
 * @param {Collection|Model} item instance
 * @param {Object} options Optional Backbone.js or MongoDB options.
 * @param {Object} query Optional MongoDB query.
 * @api public
 */
backbone.sync = function sync(method, item, options, query) {
  var defer = new Defer
    , config = {}
    , stack;

  /**
   * Trigger execution of before hooks.
   *
   * @param {Function} next callback
   * @api private
   */
  function before(next) {
    item.trigger('before:' + method, next);
  }

  /**
   * Get the Fossa client from the item.
   *
   * @param {Function} next callback
   * @api private
   */
  function getClient(next) {
    item.client(next);
  }

  /**
   * Check if the object is a Backbone Model.
   *
   * @param {Object} obj Potential Model.
   * @return {Boolean}
   * @api private
   */
  function isModel(obj) {
    return obj instanceof backbone.Model;
  }

  /**
   * Check if the object is a Backbone Collection.
   *
   * @param {Object} obj Potential Collection.
   * @return {Boolean}
   * @api private
   */
  function isCollection(obj) {
    return obj instanceof backbone.Collection;
  }

  /**
   * Recursively pluck attributes from either a Model or Collection.
   *
   * @param {Array|Object} data Array of Models or single Model
   * @returns {Mixed} Object or Array of objects
   * @api private
   */
  function pluck(data) {
    //
    // Either map as array or return object through single map.
    //
    if (Array.isArray(data)) return data.map(map);
    return map(data);

    /**
     * Recursive mapping function.
     *
     * @param {Object} d Collection, Model or plain object.
     * @returns {Object} plucked object
     * @api private
     */
    function map(d) {
      if (isModel(d)) return pluck(d.attributes);

      for (var key in d) {
        if (isCollection(d[key])) {
          d[key] = pluck(d[key].models);
        }

        if (isModel(d[key])) {
          //
          // Delete MongoDB ObjectIDs. The stored state of the model is ambigious
          // as the referenced model could have different values in its own
          // collection. Hence doing recursive storage should be limited as much
          // as possible, since duplicate data will be stored.
          //
          d[key] = pluck(d[key].attributes);
          delete d[key]._id;
        }
      }

      return d;
    }
  }

  /**
   * Persist item data to MongoDB.
   *
   * @param {Object} client Fossa MongoDB client
   * @param {Function} next callback
   * @api private
   */
  function persist(client, next) {
    var single = isModel(item)
      , data;

    switch (method) {
      case 'create':
        data = single ? [ item.clone() ] : item.clone().models;
        client.insert(pluck(data), config, function inserted(error, results) {
          if (error) return next(error);

          //
          // Set the _stored property for each model to true.
          //
          results.forEach(function each(model) {
            if (single) return item.stored = model._id;
            item.id(model._id).stored = model._id;
          });

          next(null, results);
        });
      break;

      case 'read':
        //
        // Models will be read by Model _id if no query was passed or if
        // the Model already exists in the database. This would otherwise
        // result in data ambiguity.
        //
        query = query || {};
        if (single && item.id) query._id = item.id;

        //
        // No query and Model has no ObjectId reference, return early.
        //
        if (single && !Object.keys(query).length) return next(null, null);

        //
        // Read the documents from the MongoDB database and process
        // the results, depending on the item being a Model or Collection.
        //
        client.find(query, config).toArray(function found(error, results) {
          if (error) return next(error);
          if (single) results = results[0];

          //
          // If the item is a model, parse first. After merge the results
          // of the read operation in the current item.
          //
          if (single && options.parse) results = item.parse(results, options);
          item.set(results);

          next(null, results);
        });
      break;

      case 'update':
      case 'patch':
        data = single ? [ item ] : item.models;
        async.reduce(data, 0, function loopModels(memo, model, fn) {
          model = model.clone();
          var update = { $set: pluck(model) };
          if (config.upsert) update = pluck(model);

          client.update({ _id: model.id }, update, config, function updated(error, results) {
            if (error) return next(error);

            model.stored = model.id;
            fn(null, memo + results);
          });
        }, next);
      break;

      case 'delete':
        data = single ? [ item ] : item.models;
        async.reduce(data, 0, function loopModels(memo, model, fn) {
          client.remove({ _id: model.id }, config, function updated(error, results) {
            if (error) return fn(error);

            //
            // Update the stored state properties to false.
            //
            model.stored = false;
            fn(null, memo + results);
          });
        }, next);
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
    item.trigger('after:' + method, function done(error) {
      next(error, results);
    });
  }

  //
  // Provided method is not allowed, return early.
  //
  method = method.toLowerCase();
  if (!~item._crud.indexOf(method)) return defer.next(
    new Error('Method not found')
  );

  //
  // Clone options to create a MongoDB query configuration, do not clone
  // native Backbone options.
  //
  options = options || {};
  Object.keys(options).forEach(function remove(key) {
    if (!~item._native.indexOf(key)) config[key] = options[key];
  });

  //
  // Safe mode is on by default if not fetching.
  //
  if (options && 'read' !== method) config.w = 'w' in options ? options.w : 1;

  //
  // Setup stack, always get the client and persist the data.
  // Check if before:emit needs to be added to the stack.
  // Check if after:emit needs to be added to the stack.
  //
  stack = [getClient, persist];
  if (item._events && 'before:' + method in item._events) stack.unshift(before);
  if (item._events && 'after:' + method in item._events) stack.push(after);

  async.waterfall(stack, defer.next);
  return defer;
};
