'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _Windows = require('./WindowsSystem.js');

var _Windows2 = _interopRequireDefault(_Windows);

var appName = _path2['default'].basename(process.execPath, '.exe');

function install(callback) {
  var queue = [['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', appName, '/d', process.execPath]];

  _Windows2['default'].addToRegistry(queue, callback);
}

function update(callback) {
  isAutoRunning(function (willRun) {
    if (willRun) {
      install(callback);
    } else {
      callback();
    }
  });
}

function isAutoRunning(callback) {
  var queryValue = ['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', appName];
  queryValue.unshift('query');
  _Windows2['default'].spawnReg(queryValue, function (error, stdout) {
    var doesOldKeyExist = stdout.indexOf(appName) >= 0;
    callback(doesOldKeyExist);
  });
}

function clear(callback) {
  var queryValue = ['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', appName, '/f'];
  queryValue.unshift('delete');
  _Windows2['default'].spawnReg(queryValue, function (error, stdout) {
    callback();
  });
}

exports['default'] = {
  update: update,
  install: install,
  isAutoRunning: isAutoRunning,
  clear: clear
};
module.exports = exports['default'];