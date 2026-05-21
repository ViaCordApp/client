'use strict';

// ── State ────────────────────────────────────────────────────────────────────
var _ss = {
  userId: null,
  inVoice: false,
  channelId: null,
  voiceMembers: {},  // userId -> voiceState
  sharing: false,
  localStream: null,
  peers: {},         // userId -> RTCPeerConnection
  ws: null,
  btn: null,
};

// ── Friend system state ───────────────────────────────────────────────────────
var _users = {};  // userId -> { id, username, discriminator, avatar }
var _rels  = {};  // userId -> type (1=friend, 2=blocked, 3=incoming, 4=outgoing)

// ── WebSocket intercept ──────────────────────────────────────────────────────
var _OrigWS = window.WebSocket;

function PatchedWS(url, protocols) {
  var ws = protocols ? new _OrigWS(url, protocols) : new _OrigWS(url);

  var _origSend = ws.send.bind(ws);
  ws.send = function (data) {
    try {
      var msg = JSON.parse(data);
      if (msg.op === 4 && msg.d) _onVoiceStateSent(msg.d);
      if (msg.op === 2 && msg.d && msg.d.token) _ss.token = msg.d.token;
    } catch (e) {}
    return _origSend(data);
  };

  ws.addEventListener('message', function (evt) {
    try {
      var msg = JSON.parse(evt.data);
      if (msg.op === 0) {
        if (msg.t === 'READY' && msg.d) {
          if (msg.d.user) { _ss.userId = msg.d.user.id; _users[msg.d.user.id] = msg.d.user; }
          // Populate user registry from guild members
          if (msg.d.guilds) msg.d.guilds.forEach(function (g) {
            if (g.members) g.members.forEach(function (m) { if (m.user) _users[m.user.id] = m.user; });
          });
          // Populate relationships
          if (msg.d.relationships) msg.d.relationships.forEach(function (r) {
            _rels[r.id] = r.type;
            if (r.user) _users[r.id] = r.user;
          });
        }
        if (msg.t === 'RELATIONSHIP_ADD' && msg.d) {
          _rels[msg.d.id] = msg.d.type;
          if (msg.d.user) _users[msg.d.id] = msg.d.user;
          _refreshPopout(msg.d.id);
        }
        if (msg.t === 'RELATIONSHIP_REMOVE' && msg.d) {
          delete _rels[msg.d.id];
          _refreshPopout(msg.d.id);
        }
        if (msg.t === 'GUILD_MEMBER_ADD' && msg.d && msg.d.user) _users[msg.d.user.id] = msg.d.user;
        if (msg.t === 'PRESENCE_UPDATE' && msg.d && msg.d.user) _users[msg.d.user.id] = msg.d.user;
        if (msg.t === 'VOICE_STATE_UPDATE' && msg.d) _onVoiceStateUpdate(msg.d);
      }
      if (msg.op === 20 && msg.d) _onVideoSignal(msg.d);
    } catch (e) {}
  });

  _ss.ws = ws;
  return ws;
}
PatchedWS.prototype = _OrigWS.prototype;
PatchedWS.CONNECTING = _OrigWS.CONNECTING;
PatchedWS.OPEN       = _OrigWS.OPEN;
PatchedWS.CLOSING    = _OrigWS.CLOSING;
PatchedWS.CLOSED     = _OrigWS.CLOSED;
window.WebSocket = PatchedWS;

// ── Voice tracking ────────────────────────────────────────────────────────────
function _onVoiceStateSent(d) {
  if (d.channel_id) {
    _ss.inVoice   = true;
    _ss.channelId = d.channel_id;
  } else {
    _ss.inVoice      = false;
    _ss.channelId    = null;
    _ss.voiceMembers = {};
    _stopScreenshare();
  }
  _updateButton();
}

function _onVoiceStateUpdate(d) {
  if (!d.user_id || d.user_id === _ss.userId) return;
  if (d.channel_id && d.channel_id === _ss.channelId) {
    _ss.voiceMembers[d.user_id] = d;
    // If we're already sharing, send an offer to this newcomer
    if (_ss.sharing && _ss.localStream) _offerTo(d.user_id);
  } else {
    delete _ss.voiceMembers[d.user_id];
    _closePeer(d.user_id);
  }
}

// ── WebRTC ────────────────────────────────────────────────────────────────────
function _wsSend(payload) {
  if (_ss.ws && _ss.ws.readyState === 1) _ss.ws.send(JSON.stringify(payload));
}

function _makePC(uid) {
  var pc = new RTCPeerConnection({ iceServers: [] });

  pc.onicecandidate = function (e) {
    if (e.candidate) {
      _wsSend({ op: 20, d: { type: 'VIDEO_ICE', to_user_id: uid, data: e.candidate } });
    }
  };

  pc.onaddstream = function (e) { _showRemoteVideo(uid, e.stream); };

  pc.oniceconnectionstatechange = function () {
    if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
      _closePeer(uid);
    }
  };

  _ss.peers[uid] = pc;
  return pc;
}

function _closePeer(uid) {
  var pc = _ss.peers[uid];
  if (pc) { try { pc.close(); } catch (e) {} delete _ss.peers[uid]; }
  _removeRemoteVideo(uid);
}

function _offerTo(uid) {
  if (!_ss.localStream) return;
  var pc = _makePC(uid);
  pc.addStream(_ss.localStream);
  pc.createOffer(function (offer) {
    pc.setLocalDescription(offer, function () {
      _wsSend({ op: 20, d: { type: 'VIDEO_OFFER', to_user_id: uid, data: offer } });
    }, function (e) { console.error('[ss] setLocal', e); });
  }, function (e) { console.error('[ss] createOffer', e); });
}

// ── Screenshare start/stop ───────────────────────────────────────────────────
function _startScreenshare() {
  if (_ss.sharing) { _stopScreenshare(); return; }

  // chromeMediaSource:'screen' captures the primary display.
  // enable-usermedia-screen-capturing chromium switch must be set (done in index.js).
  var constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'screen',
        maxWidth: 1920,
        maxHeight: 1080,
        maxFrameRate: 15,
      }
    }
  };

  navigator.webkitGetUserMedia(constraints, function (stream) {
    _ss.sharing     = true;
    _ss.localStream = stream;
    _updateButton();
    _showLocalPreview(stream);

    Object.keys(_ss.voiceMembers).forEach(_offerTo);

    stream.getVideoTracks()[0].onended = _stopScreenshare;
  }, function (err) {
    console.error('[ss] getUserMedia failed:', err);
  });
}

function _stopScreenshare() {
  if (_ss.localStream) {
    _ss.localStream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
    _ss.localStream = null;
  }
  Object.keys(_ss.peers).forEach(_closePeer);
  _ss.peers   = {};
  _ss.sharing = false;
  _removeLocalPreview();
  _updateButton();
  if (_ss.inVoice) _wsSend({ op: 20, d: { type: 'VIDEO_END' } });
}

// ── Incoming signals ──────────────────────────────────────────────────────────
function _onVideoSignal(d) {
  var type = d.type, from = d.from_user_id, data = d.data;

  if (type === 'VIDEO_OFFER') {
    var pc = _makePC(from);
    pc.setRemoteDescription(new RTCSessionDescription(data), function () {
      pc.createAnswer(function (ans) {
        pc.setLocalDescription(ans, function () {
          _wsSend({ op: 20, d: { type: 'VIDEO_ANSWER', to_user_id: from, data: ans } });
        }, function (e) { console.error('[ss] setLocal ans', e); });
      }, function (e) { console.error('[ss] createAnswer', e); });
    }, function (e) { console.error('[ss] setRemote offer', e); });

  } else if (type === 'VIDEO_ANSWER') {
    var pc2 = _ss.peers[from];
    if (pc2) pc2.setRemoteDescription(new RTCSessionDescription(data), function () {}, function (e) { console.error('[ss] setRemote ans', e); });

  } else if (type === 'VIDEO_ICE') {
    var pc3 = _ss.peers[from];
    if (pc3 && data) pc3.addIceCandidate(new RTCIceCandidate(data));

  } else if (type === 'VIDEO_END') {
    _closePeer(from);
  }
}

// ── UI: button injection ──────────────────────────────────────────────────────
// Poll until we find the voice panel then inject next to the hangup button.
var _panelObserver = null;

function _tryInjectButton() {
  if (_ss.btn) return; // already injected

  // Find the voice connected panel by looking for its text content
  var candidates = document.querySelectorAll('div, span, section, aside, nav');
  var voicePanel = null;

  for (var i = 0; i < candidates.length; i++) {
    var el = candidates[i];
    // Look for shallow element whose direct text includes 'Voice Connected'
    var text = '';
    for (var j = 0; j < el.childNodes.length; j++) {
      if (el.childNodes[j].nodeType === 3) text += el.childNodes[j].textContent;
    }
    if (text.trim() === 'Voice Connected') {
      voicePanel = el;
      break;
    }
  }

  if (!voicePanel) return; // not in DOM yet

  // Walk up to find a container that also holds the hangup button
  var container = voicePanel;
  for (var k = 0; k < 5; k++) {
    if (!container.parentNode) break;
    container = container.parentNode;
    // Look for a button/icon child (hangup button is likely a child here)
    var btnEls = container.querySelectorAll('a, button, [class*="btn"], [class*="button"], [class*="icon"]');
    if (btnEls.length > 0) break;
  }

  var btn = document.createElement('a');
  btn.id    = 'dc-screenshare-btn';
  btn.title = 'Share Screen';
  btn.style.cssText = [
    'display:inline-flex',
    'align-items:center',
    'justify-content:center',
    'width:28px',
    'height:28px',
    'border-radius:4px',
    'cursor:pointer',
    'color:#b9bbbe',
    'font-size:16px',
    'margin-left:4px',
    'vertical-align:middle',
    'flex-shrink:0',
  ].join(';');
  btn.textContent = '📺';
  btn.onclick = function (e) {
    e.preventDefault();
    if (_ss.sharing) { _stopScreenshare(); } else { _startScreenshare(); }
  };
  btn.onmouseenter = function () { btn.style.color = _ss.sharing ? '#ed4245' : '#fff'; };
  btn.onmouseleave = function () { btn.style.color = _ss.sharing ? '#ed4245' : '#b9bbbe'; };

  container.appendChild(btn);
  _ss.btn = btn;
}

function _updateButton() {
  var btn = _ss.btn;
  if (!btn) return;
  btn.title       = _ss.sharing ? 'Stop Sharing' : 'Share Screen';
  btn.textContent = _ss.sharing ? '⏹' : '📺';
  btn.style.color = _ss.sharing ? '#ed4245' : '#b9bbbe';
}

// ── Remote video overlay ──────────────────────────────────────────────────────
var _overlay = null;

function _ensureOverlay() {
  if (_overlay) return;
  _overlay = document.createElement('div');
  _overlay.id = 'dc-video-overlay';
  _overlay.style.cssText = [
    'position:fixed',
    'top:8px', 'right:8px',
    'display:flex',
    'flex-direction:column',
    'gap:8px',
    'z-index:9999',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(_overlay);
}

function _showRemoteVideo(uid, stream) {
  _ensureOverlay();
  _removeRemoteVideo(uid);

  var wrap = document.createElement('div');
  wrap.id = 'dc-remote-' + uid;
  wrap.style.cssText = 'pointer-events:auto;position:relative;';

  var vid = document.createElement('video');
  vid.autoplay = true;
  // srcObject wasn't available until Chrome 52; use createObjectURL for this old Chromium
  try { vid.srcObject = stream; } catch (e) { vid.src = URL.createObjectURL(stream); }
  vid.play();
  vid.style.cssText = [
    'width:320px',
    'border-radius:6px',
    'box-shadow:0 4px 16px rgba(0,0,0,0.7)',
    'background:#000',
    'display:block',
    'cursor:move',
  ].join(';');

  // Drag to reposition
  var drag = { on: false, x: 0, y: 0, r: 8, t: 0 };
  vid.onmousedown = function (e) {
    drag.on = true;
    drag.x  = e.clientX;
    drag.y  = e.clientY;
    var r = wrap.getBoundingClientRect();
    drag.r = window.innerWidth - r.right;
    drag.t = r.top;
    e.preventDefault();
  };
  document.addEventListener('mousemove', function (e) {
    if (!drag.on) return;
    wrap.style.position = 'fixed';
    wrap.style.right    = (drag.r - (e.clientX - drag.x)) + 'px';
    wrap.style.top      = (drag.t + (e.clientY - drag.y)) + 'px';
  });
  document.addEventListener('mouseup', function () { drag.on = false; });

  var closeBtn = document.createElement('div');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = [
    'position:absolute', 'top:4px', 'right:4px',
    'width:18px', 'height:18px',
    'background:rgba(0,0,0,0.65)',
    'color:#fff',
    'border-radius:50%',
    'display:flex', 'align-items:center', 'justify-content:center',
    'cursor:pointer', 'font-size:11px',
  ].join(';');
  closeBtn.onclick = function () { _closePeer(uid); };

  wrap.appendChild(vid);
  wrap.appendChild(closeBtn);
  _overlay.appendChild(wrap);
}

function _removeRemoteVideo(uid) {
  var el = document.getElementById('dc-remote-' + uid);
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

var _localPreview = null;

function _showLocalPreview(stream) {
  _removeLocalPreview();
  _localPreview = document.createElement('video');
  _localPreview.autoplay = true;
  _localPreview.muted    = true;
  try { _localPreview.srcObject = stream; } catch (e) { _localPreview.src = URL.createObjectURL(stream); }
  _localPreview.play();
  _localPreview.style.cssText = [
    'position:fixed',
    'bottom:120px', 'left:8px',
    'width:200px',
    'border-radius:6px',
    'box-shadow:0 4px 16px rgba(0,0,0,0.6)',
    'background:#000',
    'z-index:9998',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(_localPreview);
}

function _removeLocalPreview() {
  if (_localPreview) {
    _localPreview.srcObject = null;
    if (_localPreview.parentNode) _localPreview.parentNode.removeChild(_localPreview);
    _localPreview = null;
  }
}

// ── Friend system UI ─────────────────────────────────────────────────────────
var _activePopout = null; // { node, userId }

function _relCall(method, userId) {
  var token = _ss.token || (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';
  fetch('/api/users/@me/relationships/' + userId, {
    method: method,
    headers: { 'Authorization': token, 'Content-Type': 'application/json' },
  });
}

function _relLabel(userId) {
  var t = _rels[userId];
  if (t === 1) return { text: 'Remove Friend',    color: '#ed4245', action: 'DELETE' };
  if (t === 3) return { text: 'Accept Request',   color: '#43b581', action: 'PUT' };
  if (t === 4) return { text: 'Cancel Request',   color: '#faa61a', action: 'DELETE' };
  if (t === 2) return { text: 'Unblock',          color: '#faa61a', action: 'DELETE' };
  return       { text: 'Add Friend',              color: '#7289da', action: 'PUT' };
}

function _findUserIdByUsername(username) {
  var lower = username.toLowerCase();
  for (var id in _users) {
    if (_users[id].username && _users[id].username.toLowerCase() === lower) return id;
  }
  return null;
}

function _injectFriendButton(popout, userId) {
  var old = popout.querySelector('#dc-friend-btn');
  if (old) old.parentNode.removeChild(old);
  if (!userId || userId === _ss.userId) return;

  var info = _relLabel(userId);
  var btn = document.createElement('div');
  btn.id = 'dc-friend-btn';
  btn.textContent = info.text;
  btn.style.cssText = [
    'margin:0 12px 8px',
    'padding:9px',
    'border:1px solid ' + info.color,
    'border-radius:3px',
    'cursor:pointer',
    'color:' + info.color,
    'font-size:14px',
    'text-align:center',
    'font-family:inherit',
    'font-weight:500',
    'transition:background 0.1s',
  ].join(';');
  btn.onmouseenter = function () { btn.style.background = 'rgba(255,255,255,0.06)'; };
  btn.onmouseleave = function () { btn.style.background = ''; };
  btn.onclick = function () {
    _relCall(info.action, userId);
    // Optimistic update
    if (info.action === 'PUT') {
      var pending = _rels[userId] === 3 ? 1 : 4;
      _rels[userId] = pending;
    } else {
      delete _rels[userId];
    }
    _injectFriendButton(popout, userId); // re-render button
  };

  // Insert after the Message button row, before Server Mute
  var btns = popout.querySelectorAll('button, [role="button"]');
  var msgBtn = null;
  for (var i = 0; i < btns.length; i++) {
    if (btns[i].textContent.trim() === 'Message') { msgBtn = btns[i]; break; }
  }
  var insertAfter = msgBtn ? (msgBtn.parentNode || popout) : popout;
  if (msgBtn && msgBtn.parentNode) {
    msgBtn.parentNode.insertBefore(btn, msgBtn.nextSibling);
  } else {
    // Try inserting before first red/danger button (Kick/Ban)
    var firstDanger = popout.querySelector('[style*="ed4245"], [class*="danger"]');
    if (firstDanger && firstDanger.parentNode) {
      firstDanger.parentNode.insertBefore(btn, firstDanger);
    } else {
      popout.appendChild(btn);
    }
  }

  _activePopout = { node: popout, userId: userId };
}

function _checkNodeForPopout(node) {
  if (!node || node.nodeType !== 1) return;
  // User popout always has a "Message" button — use that as the fingerprint
  var btns = node.querySelectorAll ? node.querySelectorAll('button, [role="button"]') : [];
  for (var i = 0; i < btns.length; i++) {
    if (btns[i].textContent.trim() === 'Message') {
      setTimeout(function () { _tryPopout(node); }, 80);
      return;
    }
  }
  // Also check children in case the popout is a wrapper added before buttons render
  if (node.children) {
    for (var j = 0; j < node.children.length; j++) _checkNodeForPopout(node.children[j]);
  }
}

function _tryPopout(popout) {
  var username = null;
  var candidates = popout.querySelectorAll('strong, h2, h3, [class*="username"], [class*="Username"], [class*="name"]');
  for (var i = 0; i < candidates.length; i++) {
    var t = candidates[i].textContent.trim();
    // Strip discriminator suffix (#0001) if present
    if (t.indexOf('#') !== -1) t = t.split('#')[0].trim();
    if (t && t.length >= 2 && t.length <= 32 && t.indexOf('\n') === -1) { username = t; break; }
  }
  if (!username) return;

  var userId = _findUserIdByUsername(username);
  if (userId) _injectFriendButton(popout, userId);
}

function _refreshPopout(userId) {
  if (_activePopout && _activePopout.userId === userId && document.body.contains(_activePopout.node)) {
    _injectFriendButton(_activePopout.node, userId);
  }
}

var _popoutObserver = null;
function _startPopoutObserver() {
  if (_popoutObserver) return;
  _popoutObserver = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var added = mutations[i].addedNodes;
      for (var j = 0; j < added.length; j++) _checkNodeForPopout(added[j]);
    }
  });
  _popoutObserver.observe(document.body, { childList: true, subtree: true });
}

// ── Boot ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', function () {
  // Poll for the voice panel every 500ms; once found, MutationObserver handles re-injection
  setInterval(function () { _tryInjectButton(); }, 500);

  // Watch for DOM changes (panel appears/disappears)
  _panelObserver = new MutationObserver(function () {
    if (!_ss.btn) _tryInjectButton();
  });
  _panelObserver.observe(document.body, { childList: true, subtree: true });

  // Friend button injection
  _startPopoutObserver();
});

if (document.readyState === 'interactive' || document.readyState === 'complete') {
  setTimeout(function () {
    _tryInjectButton();
    _panelObserver = new MutationObserver(function () {
      if (!_ss.btn) _tryInjectButton();
    });
    _panelObserver.observe(document.body, { childList: true, subtree: true });
    _startPopoutObserver();
  }, 0);
}
