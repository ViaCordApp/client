'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _Tray = require('tray');

var _Tray2 = _interopRequireDefault(_Tray);

var _Menu = require('menu');

var _Menu2 = _interopRequireDefault(_Menu);

var _ipc = require('ipc');

var _ipc2 = _interopRequireDefault(_ipc);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _app = require('app');

var _app2 = _interopRequireDefault(_app);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _AutoRun = require('./AutoRun.js');

var _AutoRun2 = _interopRequireDefault(_AutoRun);

// these are lazy loaded into temp files
var badgeEnabledImagePath = null;
var badgeDisableImagePath = null;

function exposeAsarTempFile(asarPath, fileName) {
  // citron note: this path is only valid on windows... so if this is used on Mac OSX we need to modify
  var fullPathToAsarFile = _path2['default'].join(_path2['default'].join(_path2['default'].dirname(_app2['default'].getPath('exe')), asarPath), fileName);
  var data = _fs2['default'].readFileSync(fullPathToAsarFile);
  var nativeFilePath = _path2['default'].join(_path2['default'].join(_app2['default'].getPath('appData'), _app2['default'].getName()), fileName);
  _fs2['default'].writeFileSync(nativeFilePath, data);
  return nativeFilePath;
}

var SystemTray = (function () {
  function SystemTray(onCheckForUpdates, onQuit, onTrayClicked, appSettings) {
    var _this = this;

    _classCallCheck(this, SystemTray);

    if (badgeDisableImagePath == null) {
      badgeDisableImagePath = exposeAsarTempFile('resources/app.asar/app/images', 'tray.png');
    }

    this.appSettings = appSettings;
    this.atomTray = new _Tray2['default'](badgeDisableImagePath);

    this.contextMenu = [{
      label: 'Run ' + _path2['default'].basename(process.execPath, '.exe') + ' when my computer starts',
      type: 'checkbox',
      checked: false,
      enabled: false,
      click: this.toggleRunOnStartup.bind(this)
    }, {
      label: 'Check for updates',
      type: 'normal',
      click: onCheckForUpdates
    }, {
      type: 'separator'
    }, {
      label: 'Quit Discord',
      type: 'normal',
      click: onQuit
    }];

    this.atomTray.setContextMenu(_Menu2['default'].buildFromTemplate(this.contextMenu));

    _AutoRun2['default'].isAutoRunning(function (isAutoRunning) {
      _this.contextMenu[0].checked = isAutoRunning;
      _this.contextMenu[0].enabled = true;
      _this.atomTray.setContextMenu(_Menu2['default'].buildFromTemplate(_this.contextMenu));
    });

    _ipc2['default'].on('BADGE_IS_ENABLED', function () {
      _this.setBadge(true);
    });

    _ipc2['default'].on('BADGE_IS_DISABLED', function () {
      _this.setBadge(false);
    });

    this.atomTray.on('clicked', onTrayClicked);
  }

  _createClass(SystemTray, [{
    key: 'toggleRunOnStartup',
    value: function toggleRunOnStartup(menuItem) {
      if (!menuItem.checked) {
        _AutoRun2['default'].clear(function () {});
      } else {
        _AutoRun2['default'].install(function () {});
      }
    }
  }, {
    key: 'setBadge',
    value: function setBadge(enabled) {
      if (enabled && badgeEnabledImagePath == null) {
        badgeEnabledImagePath = exposeAsarTempFile('resources/app.asar/app/images', 'tray-unread.png');
      }

      this.atomTray.setImage(enabled ? badgeEnabledImagePath : badgeDisableImagePath);
    }
  }, {
    key: 'displayHowToCloseHint',
    value: function displayHowToCloseHint() {
      if (this.appSettings.get('trayBalloonShown') != true) {
        this.appSettings.set('trayBalloonShown', true);
        this.appSettings.save();
        this.atomTray.displayBalloon({
          title: 'Discord',
          content: '\n          Hi! Discord will run in the background to keep you in touch with your friends.\n          You can right-click here to quit.\n        '
        });
      }
    }
  }]);

  return SystemTray;
})();

exports['default'] = SystemTray;
module.exports = exports['default'];