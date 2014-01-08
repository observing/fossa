'use strict';

//
// Required modules.
//
var Backbone = require('backbone');

//
// Define map with allowed CRUD methods.
//
var crud = [
  'create',
  'read',
  'update',
  'delete'
];

//
// Overrule Backbone#sync to change the persistence.
//
Backbone.sync = function sync(method, model, options) {
  if (!~crud.indexOf(method)) return;

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
};
