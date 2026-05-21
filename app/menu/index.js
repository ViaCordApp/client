'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _Menu = require('menu');

var _Menu2 = _interopRequireDefault(_Menu);

exports['default'] = _Menu2['default'].buildFromTemplate(require('./' + process.platform));
module.exports = exports['default'];