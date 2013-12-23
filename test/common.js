'use strict';

var chai = require('chai')
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai');

chai.use(sinonChai);
chai.Assertion.includeStack = true;

//
// Expose Fossa and submodules.
//
exports.Fossa = require('../');
exports.Model = require('../lib/model');
exports.Collection = require('../lib/collection');

//
// Expose our assertations.
//
exports.expect = chai.expect;
exports.sinon = sinon;
