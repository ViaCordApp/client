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

exports['default'] = [{
  label: 'Discord',
  submenu: [{
    label: 'About Discord',
    selector: 'orderFrontStandardAboutPanel:'
  }, {
    label: 'Check for Updates...',
    click: function click() {
      return _app2['default'].emit('menu:check-for-updates');
    }
  }, SEPARATOR, {
    label: 'Preferences',
    click: function click() {
      return _app2['default'].emit('menu:open-settings');
    },
    accelerator: 'Command+,'
  }, SEPARATOR, {
    label: 'Services',
    submenu: []
  }, SEPARATOR, {
    label: 'Quit',
    click: function click() {
      return _app2['default'].quit();
    },
    accelerator: 'Command+Q'
  }]
}, {
  label: 'Edit',
  submenu: [{
    label: 'Undo',
    selector: 'undo:',
    accelerator: 'Command+Z'
  }, {
    label: 'Redo',
    selector: 'redo:',
    accelerator: 'Shift+Command+Z'
  }, SEPARATOR, {
    label: 'Cut',
    selector: 'cut:',
    accelerator: 'Command+X'
  }, {
    label: 'Copy',
    selector: 'copy:',
    accelerator: 'Command+C'
  }, {
    label: 'Paste',
    selector: 'paste:',
    accelerator: 'Command+V'
  }, {
    label: 'Select All',
    selector: 'selectAll:',
    accelerator: 'Command+A'
  }]
}, {
  label: 'View',
  submenu: [{
    label: 'Reload',
    click: function click() {
      return _BrowserWindow2['default'].getFocusedWindow().reloadIgnoringCache();
    },
    accelerator: 'Command+R'
  }, {
    label: 'Toggle Full Screen',
    click: function click() {
      return _BrowserWindow2['default'].getFocusedWindow().setFullScreen(!_BrowserWindow2['default'].getFocusedWindow().isFullScreen());
    },
    accelerator: 'Command+Control+F'
  }, SEPARATOR, {
    label: 'Developer',
    submenu: [{
      label: 'Toggle Developer Tools',
      click: function click() {
        return _BrowserWindow2['default'].getFocusedWindow().toggleDevTools();
      },
      accelerator: 'Alt+Command+I'
    }]
  }]
}, {
  label: 'Window',
  submenu: [{
    label: 'Minimize',
    selector: 'performMiniaturize:',
    accelerator: 'Command+M'
  }, {
    label: 'Zoom',
    selector: 'performZoom:'
  }, {
    label: 'Close',
    accelerator: 'Command+W',
    selector: 'hide:'
  }, SEPARATOR, {
    label: 'Bring All to Front',
    selector: 'arrangeInFront:'
  }]
}, {
  label: 'Help',
  submenu: [{
    label: 'Discord Help',
    click: function click() {
      return _app2['default'].emit('menu:open-help');
    }
  }]
}];
module.exports = exports['default'];