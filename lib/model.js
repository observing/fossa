'use strict';

//
// Required modules.
//
var mongo = require('mongodb');

//
// Shortcuts.
//
var ObjectID = mongo.ObjectID;

/**
 * Default model definition of fossa.
 *
 * Options:
 *   - fossa {Fossa} instance for use of connected client.
 *   - collection {String} which collection is this model part of.
 *   - save {Object} MongoDB options related to .
 *
 * @param {Object} options
 * @api public
 */
module.exports = function provideModel(options) {
  var fossa = options.fossa;

  return {
    /**
     * @type {String} proxy id attribute to MongoDB internal `_id`
     * @api private
     */
    idAttribute: '_id'

    /**
     * On model instantiation set basics and do some checks.
     *
     * @Constructor
     * @api public
     */
  , initialize: function initialize() {
      // Provide an MongoDB ObjectID if not present.
      if (!this.attributes._id) this.set('_id', new ObjectID);

      // Store reference to the collection this model will be in. This is
      // deliberatly not stored in attributes, it does not need to be saved.
      this.collection = options.collection;
    }

    /**
     * Proxy model saves to mongoDB, writeConcern is true by default.
     *
     * @param {Function} fn callback
     * @api public
     */
  , save: function (fn) {
      var collection = this.collection
        , update = Object.keys(this.changed).length
        , doc = update ? this.changed : this.attributes
        , options = { w: 1 }
        , query;

      // Query for the previous ObjectID in previousAttributes on changed.
      query = { '_id': this._previousAttributes._id };

      // Update model, don't use upsert of update as it will query.
      // Write if the current model hasn't had any changes.
      fossa.connect(function getConnection(err, db) {
        if (err) fossa.emit('error', err);

        if (update) return db.collection(collection).update(query, doc, options, fn);
        db.collection(collection).insert(doc, options, fn);
      });
    }
  };
};
