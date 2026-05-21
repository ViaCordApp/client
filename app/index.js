'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _app = require('app');

var _app2 = _interopRequireDefault(_app);

var _BrowserWindow = require('browser-window');

var _BrowserWindow2 = _interopRequireDefault(_BrowserWindow);

var _shell = require('shell');

var _shell2 = _interopRequireDefault(_shell);

var _ipc = require('ipc');

var _ipc2 = _interopRequireDefault(_ipc);

var _singleInstance = require('./singleInstance');

var _singleInstance2 = _interopRequireDefault(_singleInstance);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _applicationMenu = require('./menu');

var _applicationMenu2 = _interopRequireDefault(_applicationMenu);

var _Menu = require('menu');

var _Menu2 = _interopRequireDefault(_Menu);

var _autoUpdater = require('./AutoUpdater');

var _autoUpdater2 = _interopRequireDefault(_autoUpdater);

var _NotificationWindow = require('./NotificationWindow');

var _NotificationWindow2 = _interopRequireDefault(_NotificationWindow);

var _ContextMenu = require('./ContextMenu');

var _ContextMenu2 = _interopRequireDefault(_ContextMenu);

var _Utils = require('./Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _VoiceEngine = require('./VoiceEngine');

var _VoiceEngine2 = _interopRequireDefault(_VoiceEngine);

var _SystemTray = require('./SystemTray');

var _SystemTray2 = _interopRequireDefault(_SystemTray);

var _AppSettings = require('./AppSettings');

var _AppSettings2 = _interopRequireDefault(_AppSettings);

var _CrashReporter = require('crash-reporter');

var _CrashReporter2 = _interopRequireDefault(_CrashReporter);

var _SplashWindow = require('./SplashWindow.js');

var _SplashWindow2 = _interopRequireDefault(_SplashWindow);

var WIDTH = 1280;
var HEIGHT = 720;

_CrashReporter2['default'].start({
  productName: 'Discord',
  companyName: 'Hammer & Chisel, Inc.',
  submitUrl: 'http://45.33.95.252:1127/post',
  autoSubmit: true,
  ignoreSystemCrashHandler: false
});

_app2['default'].commandLine.appendSwitch('in-process-gpu');
_app2['default'].commandLine.appendSwitch('enable-usermedia-screen-capturing');

var mainWindow = null;
var notificationWindow = null;
var contextMenu = null;
var systemTray = null;
var appSettings = null;
var splashWindow = null;

function getUserHome() {
  return process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME'];
}

function webContentsSend() {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  if (mainWindow != null && mainWindow.webContents != null) {
    var _mainWindow$webContents;

    (_mainWindow$webContents = mainWindow.webContents).send.apply(_mainWindow$webContents, args);
  }
}

function extractPath(args, fallbackPath) {
  if (args[0] === '--url') {
    var parsedURL = _url2['default'].parse(args[1]);
    if (parsedURL.protocol === 'discord:') {
      return parsedURL.path;
    }
  }
  return fallbackPath;
}

function setWindowVisible(isVisible) {
  if (mainWindow == null) {
    return;
  }

  if (isVisible) {
    mainWindow.show();
  } else {
    mainWindow.hide();
    systemTray.displayHowToCloseHint();
  }

  mainWindow.setSkipTaskbar(!isVisible);
}

function main() {
  if (process.platform === 'win32') {
    var _require = require('./SquirrelUpdate');

    var handleStartupEvent = _require.handleStartupEvent;

    var squirrelCommand = process.argv[1];
    if (handleStartupEvent('Discord', _app2['default'], squirrelCommand)) {
      return;
    }
  }

  var API_ENDPOINT = 'https://app.viacord.org/api';
  var WEBAPP_ENDPOINT = 'https://app.viacord.org';
  var AUTO_UPDATE = false;

  var appPath = extractPath(process.argv.slice(1), '/channels/@me');

  var releaseChannel = _singleInstance2['default'].releaseChannel;
  console.log('Using update channel \'' + releaseChannel + '\'');

  if (_autoUpdater2['default'] != null) {
    (function () {
      var autoUpdaterState = 'UPDATE_NOT_AVAILABLE';
      _autoUpdater2['default'].on('checking-for-update', function () {
        autoUpdaterState = 'CHECKING_FOR_UPDATES';
        webContentsSend(autoUpdaterState);
      });
      _autoUpdater2['default'].on('update-not-available', function () {
        autoUpdaterState = 'UPDATE_NOT_AVAILABLE';
        webContentsSend(autoUpdaterState);
      });
      _autoUpdater2['default'].on('update-available', function () {
        autoUpdaterState = 'UPDATE_AVAILABLE';
        webContentsSend(autoUpdaterState);
      });
      _autoUpdater2['default'].on('error', function (event, message) {
        autoUpdaterState = 'UPDATE_NOT_AVAILABLE';
        webContentsSend('UPDATE_ERROR', message);
      });
      _autoUpdater2['default'].on('update-downloaded', function (event, releaseNotes, releaseName, releaseDate, updateUrl) {
        autoUpdaterState = 'UPDATE_DOWNLOADED';
        webContentsSend(autoUpdaterState, releaseNotes, releaseName, releaseDate, updateUrl);
      });

      switch (process.platform) {
        case 'darwin':
          _autoUpdater2['default'].setFeedUrl('' + API_ENDPOINT + '/' + releaseChannel + '/updates?version=' + _app2['default'].getVersion());
          break;
        case 'win32':
          // Squirrel for Windows can't handle query params
          // https://github.com/Squirrel/Squirrel.Windows/issues/132
          _autoUpdater2['default'].setFeedUrl('' + API_ENDPOINT + '/' + releaseChannel + '/updates');
          break;
      }

      _ipc2['default'].on('CHECK_FOR_UPDATES', function (event, arg) {
        if (autoUpdaterState === 'UPDATE_NOT_AVAILABLE') {
          _autoUpdater2['default'].checkForUpdates();
        } else {
          webContentsSend(autoUpdaterState);
        }
      });
      _ipc2['default'].on('QUIT_AND_INSTALL', function (event, arg) {
        _autoUpdater2['default'].quitAndInstall();
      });
    })();
  }

  _app2['default'].on('open-url', function (event, openURL) {
    var parsedURL = _url2['default'].parse(openURL);
    if (parsedURL.protocol === 'discord:') {
      if (mainWindow == null) {
        appPath = parsedURL.path;
      } else {
        webContentsSend('PATH', parsedURL.path);
      }
    }
  });

  _app2['default'].on('menu:open-help', function () {
    return webContentsSend('HELP_OPEN');
  });
  _app2['default'].on('menu:open-settings', function () {
    return webContentsSend('USER_SETTINGS_OPEN');
  });
  _app2['default'].on('menu:check-for-updates', function () {
    return _autoUpdater2['default'].checkForUpdates();
  });

  _app2['default'].on('before-quit', function () {
    mainWindow = null;
    contextMenu = null;
    if (notificationWindow != null) {
      notificationWindow.close();
    }
  });

  function launchMainAppWindow(isVisible) {
    mainWindow = new _BrowserWindow2['default']({
      width: WIDTH,
      height: HEIGHT,
      transparent: false,
      frame: false,
      resizable: true,
      show: isVisible,
      preload: _path2['default'].join(__dirname, 'preload.js')
    });
    mainWindow.webContents.on('new-window', function (e, windowURL) {
      e.preventDefault();
      _shell2['default'].openExternal(windowURL);
    });

    mainWindow.loadUrl('' + WEBAPP_ENDPOINT + '' + appPath + '?_=' + Date.now());

    contextMenu = new _ContextMenu2['default'](mainWindow);

    if (process.platform === 'win32') {
      notificationWindow = new _NotificationWindow2['default'](mainWindow, {
        title: 'Discord Notifications',
        maxVisible: 5,
        screenPosition: 'bottom'
      });

      notificationWindow.on('notification-click', function () {
        setWindowVisible(true);
      });

      appSettings = new _AppSettings2['default']();

      systemTray = new _SystemTray2['default'](function () {
        return _autoUpdater2['default'].checkForUpdates();
      }, function () {
        return _app2['default'].quit();
      }, function () {
        return setWindowVisible(true);
      }, appSettings);

      mainWindow.on('close', function (e) {
        if (mainWindow === null) {
          // this means we're quitting
          return;
        }
        _Utils2['default'].setFocused(false);
        setWindowVisible(false);
        e.preventDefault();
      });
    }

    mainWindow.on('focus', function () {
      _Utils2['default'].setFocused(true);
    });

    mainWindow.on('blur', function () {
      _Utils2['default'].setFocused(false);
      // invoking Utils.purgeMemory() purges in the main process, and
      // webContentsSend() instructs the renderer processes to do the
      // same
      _Utils2['default'].purgeMemory();
      webContentsSend('PURGE_MEMORY');
      webContentsSend('MAIN_WINDOW_BLUR');
    });

    _Utils2['default'].setFocused(mainWindow.isFocused());
  }

  _app2['default'].on('ready', function () {
    global.VoiceEngine = _VoiceEngine2['default'];

    _Menu2['default'].setApplicationMenu(_applicationMenu2['default']);

    _singleInstance2['default'].create(function () {
      if (AUTO_UPDATE && _autoUpdater2['default'] != null) {
        splashWindow = new _SplashWindow2['default']();
        splashWindow.once(_SplashWindow2['default'].EVENT_APP_SHOULD_LAUNCH, function () {
          return launchMainAppWindow(false);
        });
        splashWindow.once(_SplashWindow2['default'].EVENT_APP_SHOULD_SHOW, function () {
          return setWindowVisible(true);
        });
      } else {
        launchMainAppWindow(true);
      }
    }, function (args) {
      if (args != null && args.length > 0 && args[0] === '--squirrel-uninstall') {
        _app2['default'].quit();
        return;
      }

      if (mainWindow != null) {
        appPath = extractPath(args);
        if (appPath != null) {
          webContentsSend('PATH', appPath);
        }
        setWindowVisible(true);
        mainWindow.focus();
      } else if (splashWindow != null) {
        splashWindow.focus();
      }
    });
  });
}

main();