'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _React = require('react/addons');

var _React2 = _interopRequireDefault(_React);

var _ipc = require('ipc');

var _ipc2 = _interopRequireDefault(_ipc);

var _TimeoutMixin = require('../mixins/TimeoutMixin.js');

var _TimeoutMixin2 = _interopRequireDefault(_TimeoutMixin);

var Splash = _React2['default'].createClass({
  displayName: 'Splash',

  mixins: [_TimeoutMixin2['default']],

  getInitialState: function getInitialState() {
    return {
      className: '',
      countdownSeconds: null
    };
  },

  getDefaultProps: function getDefaultProps() {
    return {
      status: null,
      countdownSeconds: null
    };
  },

  handleVideoTimeUpdate: function handleVideoTimeUpdate(video) {
    if (video.target.currentTime >= 6.366666667) {
      video.target.currentTime = 3.4;
    }
  },

  componentDidMount: function componentDidMount() {
    var _this = this;

    this.refs.loadingVideo.getDOMNode().addEventListener('timeupdate', this.handleVideoTimeUpdate);
    this.setTimeout(1200, function () {
      return _this.setState({ className: 'in' });
    });
    this.countdownTimerId = setInterval(this.updateCountdownSeconds, 1000);
  },

  componentWillUnmount: function componentWillUnmount() {
    if (this.countdownTimerId != null) {
      clearInterval(this.countdownTimerId);
    }
  },

  updateCountdownSeconds: function updateCountdownSeconds() {
    if (this.props.countdownSeconds != null) {
      this.setState({ countdownSeconds: this.state.countdownSeconds - 1 });
    }
  },

  componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
    this.setState({ countdownSeconds: nextProps.countdownSeconds });
  },

  render: function render() {
    var countdownHtml = null;
    if (this.props.countdownSeconds != null) {
      if (this.state.countdownSeconds <= 60) {
        countdownHtml = _React2['default'].createElement(
          'span',
          null,
          this.state.countdownSeconds
        );
      } else {
        countdownHtml = _React2['default'].createElement(
          'span',
          null,
          Math.floor(this.state.countdownSeconds / 60),
          ':',
          Math.floor(this.state.countdownSeconds % 60)
        );
      }
    }

    return _React2['default'].createElement(
      'div',
      { className: 'splash' },
      _React2['default'].createElement('video', { ref: 'loadingVideo', width: '300', height: '300', autoPlay: 'true', src: '../video/discord_loading_splash.webm' }),
      _React2['default'].createElement(
        'div',
        { className: 'loading-text ' + this.state.className },
        this.props.status,
        ' ',
        countdownHtml
      )
    );
  }
});

_React2['default'].render(_React2['default'].createElement(Splash, { status: 'Checking for updates' }), document.getElementById('splash-mount'));

_ipc2['default'].on('CHECKING_FOR_UPDATES', function () {
  _React2['default'].render(_React2['default'].createElement(Splash, { status: 'Checking for updates' }), document.getElementById('splash-mount'));
});

_ipc2['default'].on('UPDATE_AVAILABLE', function () {
  _React2['default'].render(_React2['default'].createElement(Splash, { status: 'Downloading update' }), document.getElementById('splash-mount'));
});

_ipc2['default'].on('SPLASH_SCREEN_LOADING_APP_NOW', function () {
  _React2['default'].render(_React2['default'].createElement(Splash, { status: 'Starting Up!' }), document.getElementById('splash-mount'));
});

_ipc2['default'].on('ERROR_OCCURRED_NOW_RETRYING', function (seconds) {
  _React2['default'].render(_React2['default'].createElement(Splash, { status: 'Updating failed. Retrying in ', countdownSeconds: seconds }), document.getElementById('splash-mount'));
});

_ipc2['default'].send('SPLASH_SCREEN_READY');