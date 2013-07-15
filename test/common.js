'use strict';

var chai = require('chai')
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai');

chai.use(sinonChai);
chai.Assertion.includeStack = true;

//
// Expose Fossa
//
exports.Fossa = require('../');

//
// Expose our assertations.
//
exports.expect = chai.expect;
exports.sinon = sinon;
