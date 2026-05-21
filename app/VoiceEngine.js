'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _BrowserWindow = require('browser-window');

var _BrowserWindow2 = _interopRequireDefault(_BrowserWindow);

var _EventEmitter = require('events');

var _process$binding = process.binding('discord_voice_engine');

var VoiceEngine = _process$binding.VoiceEngine;

VoiceEngine.prototype.__proto__ = _EventEmitter.EventEmitter.prototype;
VoiceEngine.prototype.createTransport = function (ssrc, userId, serverIp, port, callback) {
  this._createTransport(this, ssrc, userId, serverIp, port, callback);
};
VoiceEngine.prototype._init = function () {};

exports['default'] = new VoiceEngine({});
module.exports = exports['default'];