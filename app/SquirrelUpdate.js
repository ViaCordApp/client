'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _ChildProcess = require('child_process');

var _ChildProcess2 = _interopRequireDefault(_ChildProcess);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _AutoRun = require('./AutoRun.js');

var _AutoRun2 = _interopRequireDefault(_AutoRun);

var _Windows = require('./WindowsSystem.js');

var _Windows2 = _interopRequireDefault(_Windows);

var _singleInstance = require('./singleInstance');

var _singleInstance2 = _interopRequireDefault(_singleInstance);

var appFolder = _path2['default'].resolve(process.execPath, '..');
var rootFolder = _path2['default'].resolve(appFolder, '..');
var exeName = _path2['default'].basename(process.execPath);
var updateExe = _path2['default'].join(rootFolder, 'Update.exe');

// Spawn the Update.exe with the given arguments and invoke the callback when
// the command completes.
function spawnUpdate(args, callback) {
  _Windows2['default'].spawn(updateExe, args, callback);
}

// Is the Update.exe installed?
function existsSync() {
  return _fs2['default'].existsSync(updateExe);
}

// Restart App.
function restart(app, newVersion) {
  app.once('will-quit', function () {
    // citron note: this assumes the execPath is in the format Discord/oldVersion/Discord.exe and will
    //              replace the oldVersion folder part with newVersion.
    var execPath = _path2['default'].resolve(process.execPath, '../../app-' + newVersion + '/' + exeName);
    _ChildProcess2['default'].spawn(execPath, [], { detached: true });
  });
  app.quit();
}

// Create a desktop and start menu shortcut by using the command line API
// provided by Squirrel's Update.exe
function createShortcuts(callback) {
  spawnUpdate(['--createShortcut', exeName], callback);
}

// Update the desktop and start menu shortcuts by using the command line API
// provided by Squirrel's Update.exe
function updateShortcuts(callback) {
  var homeDirectory = process.env.USERPROFILE;
  if (homeDirectory != null) {
    var desktopShortcutPath = _path2['default'].join(homeDirectory, 'Desktop', _path2['default'].basename(exeName, '.exe') + '.lnk');
    // Check if the desktop shortcut has been previously deleted and
    // and keep it deleted if it was
    _fs2['default'].exists(desktopShortcutPath, function (desktopShortcutExists) {
      if (desktopShortcutExists) {
        createShortcuts(callback);
      } else {
        callback();
      }
    });
  } else {
    createShortcuts(callback);
  }
}

// Remove the desktop and start menu shortcuts by using the command line API
// provided by Squirrel's Update.exe
function removeShortcuts(callback) {
  spawnUpdate(['--removeShortcut', exeName], callback);
}

// Add a protocol registration for this application.
function installProtocol(protocol, callback) {
  var queue = [['HKCU\\Software\\Classes\\' + protocol, '/ve', '/d', 'URL:' + protocol + ' Protocol'], ['HKCU\\Software\\Classes\\' + protocol, '/v', 'URL Protocol'], ['HKCU\\Software\\Classes\\' + protocol + '\\DefaultIcon', '/ve', '/d', '"' + process.execPath + '",-1'], ['HKCU\\Software\\Classes\\' + protocol + '\\shell\\open\\command', '/ve', '/d', '"' + process.execPath + '" --url "%1"']];

  _Windows2['default'].addToRegistry(queue, callback);
}

// Purge the protocol for this applicationstart.
function uninstallProtocol(protocol, callback) {
  _Windows2['default'].spawnReg(['delete', 'HKCU\\Software\\Classes\\' + protocol, '/f'], callback);
}

// Handle squirrel events denoted by --squirrel-* command line arguments.
function handleStartupEvent(protocol, app, squirrelCommand) {
  switch (squirrelCommand) {
    case '--squirrel-install':
      createShortcuts(function () {
        _AutoRun2['default'].install(function () {
          installProtocol(protocol, function () {
            app.quit();
          });
        });
      });

      return true;
    case '--squirrel-updated':
      updateShortcuts(function () {
        _AutoRun2['default'].update(function () {
          installProtocol(protocol, function () {
            app.quit();
          });
        });
      });
      return true;
    case '--squirrel-uninstall':
      removeShortcuts(function () {
        _AutoRun2['default'].clear(function () {
          uninstallProtocol(protocol, function () {
            _singleInstance2['default'].pipeCommandLineArgs(function () {
              return app.terminate();
            }, function () {
              return app.terminate();
            });
          });
        });
      });
      return true;
    case '--squirrel-obsolete':
      app.quit();
      return true;
    default:
      // createShortcuts();
      // installProtocol(protocol);
      return false;
  }
}

exports['default'] = {
  spawn: spawnUpdate,
  restart: restart,
  existsSync: existsSync,
  handleStartupEvent: handleStartupEvent
};
module.exports = exports['default'];