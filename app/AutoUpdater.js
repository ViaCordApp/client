'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _EventEmitter2 = require('events');

var _SquirrelUpdate = require('./SquirrelUpdate');

var _SquirrelUpdate2 = _interopRequireDefault(_SquirrelUpdate);

var _app = require('app');

var _app2 = _interopRequireDefault(_app);

var AutoUpdaterWin32 = (function (_EventEmitter) {
  function AutoUpdaterWin32() {
    _classCallCheck(this, AutoUpdaterWin32);

    _get(Object.getPrototypeOf(AutoUpdaterWin32.prototype), 'constructor', this).call(this);

    this.updateUrl = null;
    this.updateVersion = null;
  }

  _inherits(AutoUpdaterWin32, _EventEmitter);

  _createClass(AutoUpdaterWin32, [{
    key: 'setFeedUrl',
    value: function setFeedUrl(updateUrl) {
      this.updateUrl = updateUrl;
    }
  }, {
    key: 'quitAndInstall',
    value: function quitAndInstall() {
      if (_SquirrelUpdate2['default'].existsSync()) {
        _SquirrelUpdate2['default'].restart(_app2['default'], this.updateVersion || _app2['default'].getVersion());
      } else {
        require('auto-updater').quitAndInstall();
      }
    }
  }, {
    key: 'downloadAndInstallUpdate',
    value: function downloadAndInstallUpdate(callback) {
      _SquirrelUpdate2['default'].spawn(['--update', this.updateUrl], callback);
    }
  }, {
    key: 'checkForUpdates',
    value: function checkForUpdates() {
      var _this = this;

      if (this.updateUrl == null) {
        throw new Error('Update URL is not set');
      }

      this.emit('checking-for-update');

      if (!_SquirrelUpdate2['default'].existsSync()) {
        this.emit('update-not-available');
        return;
      }

      _SquirrelUpdate2['default'].spawn(['--check', this.updateUrl], function (error, stdout) {
        if (error != null) {
          _this.emit('error', error);
          return;
        }

        try {
          var _ret = (function () {
            // Last line of the output is JSON detauls about the releases
            var json = stdout.trim().split('\n').pop();
            var releasesFound = JSON.parse(json).releasesToApply;
            if (releasesFound == null || releasesFound.length == 0) {
              _this.emit('update-not-available');
              return {
                v: undefined
              };
            }

            var update = releasesFound.pop();
            _this.emit('update-available');
            _this.downloadAndInstallUpdate(function (error) {
              if (error != null) {
                _this.emit('error', error);
                return;
              }

              _this.updateVersion = update.version;

              _this.emit('update-downloaded', {}, update.release, update.version, new Date(), _this.updateUrl, _this.quitAndInstall.bind(_this));
            });
          })();

          if (typeof _ret === 'object') return _ret.v;
        } catch (error) {
          error.stdout = stdout;
          _this.emit('error', error);
        }
      });
    }
  }]);

  return AutoUpdaterWin32;
})(_EventEmitter2.EventEmitter);

var autoUpdater = undefined;
switch (process.platform) {
  case 'darwin':
    autoUpdater = require('auto-updater');
    break;
  case 'win32':
    autoUpdater = new AutoUpdaterWin32();
    break;
}

exports['default'] = autoUpdater;
module.exports = exports['default'];