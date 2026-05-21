'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _app = require('app');

var _app2 = _interopRequireDefault(_app);

var _shell = require('shell');

var _shell2 = _interopRequireDefault(_shell);

var _BrowserWindow = require('browser-window');

var _BrowserWindow2 = _interopRequireDefault(_BrowserWindow);

var SEPARATOR = { type: 'separator' };

function webContentsCallback() {
  return function () {
    return _BrowserWindow2['default'].getFocusedWindow().webContents[fn]();
  };
}

exports['default'] = [{
  label: '&File',
  submenu: [{
    label: '&Options',
    click: function click() {
      return _app2['default'].emit('menu:open-settings');
    },
    accelerator: 'Ctrl+,'
  }, SEPARATOR, {
    label: 'E&xit',
    click: function click() {
      return _app2['default'].quit();
    },
    accelerator: 'Alt+F4'
  }]
}, {
  label: '&Edit',
  submenu: [{
    label: '&Undo',
    click: webContentsCallback('undo'),
    accelerator: 'Control+Z'
  }, {
    label: '&Redo',
    click: webContentsCallback('redo'),
    accelerator: 'Control+Y'
  }, SEPARATOR, {
    label: '&Cut',
    click: webContentsCallback('cut'),
    accelerator: 'Control+X'
  }, {
    label: 'C&opy',
    click: webContentsCallback('copy'),
    accelerator: 'Control+C'
  }, {
    label: '&Paste',
    click: webContentsCallback('paste'),
    accelerator: 'Control+V'
  }, {
    label: 'Select &All',
    click: webContentsCallback('selectAll'),
    accelerator: 'Control+A'
  }]
}, {
  label: '&View',
  submenu: [{
    label: '&Reload',
    click: function click() {
      return _BrowserWindow2['default'].getFocusedWindow().reloadIgnoringCache();
    },
    accelerator: 'Control+R'
  }, {
    label: 'Toggle &Full Screen',
    click: function click() {
      return _BrowserWindow2['default'].getFocusedWindow().setFullScreen(!_BrowserWindow2['default'].getFocusedWindow().isFullScreen());
    },
    accelerator: 'Control+Shift+F'
  }, SEPARATOR, {
    label: '&Developer',
    submenu: [{
      label: 'Toggle Developer &Tools',
      click: function click() {
        return _BrowserWindow2['default'].getFocusedWindow().toggleDevTools();
      },
      accelerator: 'Control+Shift+I'
    }]
  }]
}, {
  label: '&Help',
  submenu: [{
    label: 'Check for Updates...',
    click: function click() {
      return _app2['default'].emit('menu:check-for-updates');
    }
  }, SEPARATOR, {
    label: 'Discord Help',
    click: function click() {
      return _app2['default'].emit('menu:open-help');
    }
  }]
}];
module.exports = exports['default'];