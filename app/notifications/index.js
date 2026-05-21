'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _React = require('react/addons');

var _React2 = _interopRequireDefault(_React);

var _ipc = require('ipc');

var _ipc2 = _interopRequireDefault(_ipc);

var Notification = _React2['default'].createClass({
  displayName: 'Notification',

  getInitialState: function getInitialState() {
    return {
      className: 'in'
    };
  },

  handeClick: function handeClick() {
    this.props.onClick(this.props.id);
  },

  handleDismiss: function handleDismiss(e) {
    e.preventDefault();
    e.stopPropagation();
    this.props.onDismiss(this.props.id);
  },

  handleAnimationEnd: function handleAnimationEnd() {
    if (this.animationCallback) {
      this.animationCallback();
      this.animationCallback = null;
    }
  },

  componentDidMount: function componentDidMount() {
    this.getDOMNode().addEventListener('webkitAnimationEnd', this.handleAnimationEnd);
  },

  componentWillEnter: function componentWillEnter(callback) {
    this.animationCallback = callback;
  },

  componentWillLeave: function componentWillLeave(callback) {
    this.setState({ className: 'out' });
    this.animationCallback = callback;
  },

  render: function render() {
    return _React2['default'].createElement(
      'div',
      { className: 'notification ' + this.state.className, onClick: this.handeClick },
      _React2['default'].createElement('button', { type: 'button', className: 'notification-dismiss', onClick: this.handleDismiss }),
      _React2['default'].createElement(
        'div',
        { className: 'notification-contents' },
        _React2['default'].createElement('div', { className: 'notification-icon', style: { backgroundImage: 'url(\'' + this.props.icon + '\')' } }),
        _React2['default'].createElement(
          'div',
          { className: 'notification-body' },
          _React2['default'].createElement(
            'header',
            null,
            this.props.title
          ),
          _React2['default'].createElement(
            'p',
            null,
            this.props.body
          )
        )
      ),
      _React2['default'].createElement('div', { className: 'notification-logo' })
    );
  }
});

var Notifications = _React2['default'].createClass({
  displayName: 'Notifications',

  handleNotificationClick: function handleNotificationClick(notificationId) {
    _ipc2['default'].send('NOTIFICATION_CLICK', notificationId);
  },

  handleNotificationDismiss: function handleNotificationDismiss(notificationId) {
    _ipc2['default'].send('NOTIFICATION_CLOSE', notificationId);
  },

  render: function render() {
    var _this = this;

    var notifications = this.props.notifications.map(function (notification) {
      return _React2['default'].createElement(Notification, _extends({}, notification, {
        key: notification.id,
        onClick: _this.handleNotificationClick,
        onDismiss: _this.handleNotificationDismiss }));
    });
    return _React2['default'].createElement(
      _React2['default'].addons.TransitionGroup,
      { id: 'notifications' },
      notifications
    );
  }
});

_ipc2['default'].on('UPDATE', function (notifications) {
  _React2['default'].render(_React2['default'].createElement(Notifications, { notifications: notifications }), document.getElementById('notifications-mount'));
});