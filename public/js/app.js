/* ═══════════════════════════════════════════════════
   SEEDCHAT · 前端应用 v2
   SVG图标 · 深色主题 · 移动适配 · 动态交互 · 群邀请
   ═══════════════════════════════════════════════════ */

// ═══ SVG 图标系统 ═══
const I = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
  userPlus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
  heartFill: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
  comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14l-1.5-9h-11z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
  ban: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  arrowDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
};

// ═══ 全局状态 ═══
const S = {
  user: null,
  token: localStorage.getItem('token') || null,
  view: 'forum',
  postId: null,
  chatPeer: null,
  groupId: null,
  chatMode: 'private',
  ws: null,
  messages: {},
  groupMessages: {},
  notifUnread: 0,
  tempImages: [],
  selectedMembers: [],
};

// ═══ API 客户端 ═══
const api = {
  async req(path, opts = {}) {
    const h = { 'Content-Type': 'application/json', ...opts.headers };
    if (S.token) h['Authorization'] = `Bearer ${S.token}`;
    const r = await fetch(`/api${path}`, { ...opts, headers: h });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || '请求失败');
    return d;
  },
  register: d => api.req('/auth/register', { method: 'POST', body: JSON.stringify(d) }),
  login: d => api.req('/auth/login', { method: 'POST', body: JSON.stringify(d) }),
  logout: () => api.req('/auth/logout', { method: 'POST' }),
  getMe: () => api.req('/auth/me'),
  searchUsers: q => api.req(`/users/search?q=${encodeURIComponent(q)}`),
  getUser: id => api.req(`/users/${id}`),
  getPosts: (p, a) => api.req(`/posts?page=${p || 1}${a ? `&author_id=${a}` : ''}`),
  getPost: id => api.req(`/posts/${id}`),
  createPost: d => api.req('/posts', { method: 'POST', body: JSON.stringify(d) }),
  editPost: (id, d) => api.req(`/posts/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deletePost: id => api.req(`/posts/${id}`, { method: 'DELETE' }),
  likePost: id => api.req(`/posts/${id}/like`, { method: 'POST' }),
  unlikePost: id => api.req(`/posts/${id}/like`, { method: 'DELETE' }),
  pinPost: id => api.req(`/posts/${id}/pin`, { method: 'POST' }),
  getComments: id => api.req(`/posts/${id}/comments`),
  createComment: (id, d) => api.req(`/posts/${id}/comments`, { method: 'POST', body: JSON.stringify(d) }),
  deleteComment: id => api.req(`/comments/${id}`, { method: 'DELETE' }),
  getFriends: () => api.req('/friends'),
  getFriendRequests: () => api.req('/friends/requests'),
  sendFriendRequest: id => api.req('/friends/request', { method: 'POST', body: JSON.stringify({ toUserId: id }) }),
  acceptFriend: id => api.req('/friends/accept', { method: 'POST', body: JSON.stringify({ requestId: id }) }),
  rejectFriend: id => api.req('/friends/reject', { method: 'POST', body: JSON.stringify({ requestId: id }) }),
  removeFriend: id => api.req(`/friends/${id}`, { method: 'DELETE' }),
  getConversations: () => api.req('/messages/conversations'),
  getMessages: (id, b) => api.req(`/messages/${id}${b ? `?before=${b}` : ''}`),
  sendMessage: d => api.req('/messages', { method: 'POST', body: JSON.stringify(d) }),
  recallMessage: id => api.req(`/messages/${id}/recall`, { method: 'POST' }),
  getGroups: () => api.req('/groups'),
  createGroup: d => api.req('/groups', { method: 'POST', body: JSON.stringify(d) }),
  getGroup: id => api.req(`/groups/${id}`),
  getGroupMessages: (id, b) => api.req(`/groups/${id}/messages${b ? `?before=${b}` : ''}`),
  sendGroupMessage: (id, d) => api.req(`/groups/${id}/messages`, { method: 'POST', body: JSON.stringify(d) }),
  recallGroupMessage: (gid, mid) => api.req(`/groups/${gid}/messages/${mid}/recall`, { method: 'POST' }),
  addGroupMember: (gid, uid) => api.req(`/groups/${gid}/members`, { method: 'POST', body: JSON.stringify({ userId: uid }) }),
  removeGroupMember: (gid, uid) => api.req(`/groups/${gid}/members/${uid}`, { method: 'DELETE' }),
  leaveGroup: gid => api.req(`/groups/${gid}/leave`, { method: 'POST' }),
  deleteGroup: gid => api.req(`/groups/${gid}`, { method: 'DELETE' }),
  createInvite: gid => api.req(`/groups/${gid}/invite`, { method: 'POST' }),
  getInvite: gid => api.req(`/groups/${gid}/invite`),
  getInviteInfo: code => api.req(`/groups/invite/${code}`),
  joinGroup: code => api.req('/groups/join', { method: 'POST', body: JSON.stringify({ code }) }),
  getBlacklist: () => api.req('/blacklist'),
  addToBlacklist: uid => api.req('/blacklist', { method: 'POST', body: JSON.stringify({ userId: uid }) }),
  removeFromBlacklist: uid => api.req(`/blacklist/${uid}`, { method: 'DELETE' }),
  uploadImage: img => api.req('/images/upload', { method: 'POST', body: JSON.stringify({ image: img }) }),
  updateProfile: d => api.req('/settings/profile', { method: 'PUT', body: JSON.stringify(d) }),
  changePassword: d => api.req('/settings/password', { method: 'PUT', body: JSON.stringify(d) }),
  deleteAccount: d => api.req('/settings/account', { method: 'DELETE', body: JSON.stringify(d) }),
  getNotifications: () => api.req('/notifications'),
  readNotification: id => api.req(`/notifications/${id}/read`, { method: 'PUT' }),
  readAllNotifications: () => api.req('/notifications/read-all', { method: 'PUT' }),
};

// ═══ WebSocket ═══
function connectWS() {
  if (!S.token) return;
  const p = location.protocol === 'https:' ? 'wss:' : 'ws:';
  S.ws = new WebSocket(`${p}//${location.host}/api/ws?token=${S.token}`);
  S.ws.onopen = () => setInterval(() => S.ws?.readyState === 1 && S.ws.send(JSON.stringify({ type: 'ping' })), 30000);
  S.ws.onmessage = e => { try { handleWS(JSON.parse(e.data)); } catch {} };
  S.ws.onclose = () => { if (S.token) setTimeout(connectWS, 3000); };
}

function wsSend(d) { if (S.ws?.readyState === 1) S.ws.send(JSON.stringify(d)); }

function handleWS(d) {
  switch (d.type) {
    case 'private_message': onPrivMsg(d); break;
    case 'group_message': onGroupMsg(d); break;
    case 'recall_message': S.chatPeer === d.fromId && openChat(S.chatPeer); break;
    case 'recall_group_message': S.groupId === d.groupId && openGroup(d.groupId); break;
    case 'new_post': onNewPost(d); break;
    case 'user_status': S.view === 'friends' && renderFriends(); break;
    case 'friend_request': case 'friend_accept':
      toast(d.type === 'friend_request' ? '收到新的好友请求' : '好友请求已通过', 'success'); loadNotifs(); break;
    case 'group_member_joined':
      toast(`${d.userName} 加入了群聊`, 'success');
      if (S.groupId === d.groupId) openGroup(d.groupId); break;
    case 'pong': break;
  }
}

// ═══ 图片压缩 ═══
async function compressImg(file, maxW = 1280, q = 0.8) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = e => {
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > maxW) { h = h * maxW / w; w = maxW; }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        c.toBlob(b => {
          const r = new FileReader();
          r.onload = () => res(r.result.split(',')[1]);
          r.onerror = rej;
          r.readAsDataURL(b);
        }, file.type === 'image/png' ? 'image/png' : 'image/jpeg', q);
      };
      img.onerror = rej; img.src = e.target.result;
    };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}

async function uploadImg(file) {
  const b64 = await compressImg(file);
  return (await api.uploadImage(b64)).url;
}

// ═══ 工具函数 ═══
function avatarHtml(u, sz = '') {
  const cls = sz ? `avatar avatar-${sz}` : 'avatar';
  if (u?.avatar) return `<div class="${cls}"><img src="${u.avatar}" alt=""></div>`;
  return `<div class="${cls}">${(u?.nickname || u?.username || '?')[0].toUpperCase()}</div>`;
}

function fmtTime(ts) {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
  const d = new Date(ts * 1000);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function toast(msg, type = '') {
  const icon = type === 'success' ? I.check : type === 'error' ? I.alert : '';
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon ? icon : ''}<span>${esc(msg)}</span>`;
  document.getElementById('toast-root').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(-10px)'; setTimeout(() => el.remove(), 300); }, 2800);
}

function showModal(html) {
  const o = document.createElement('div');
  o.className = 'modal-overlay';
  o.innerHTML = `<div class="modal">${html}</div>`;
  o.addEventListener('click', e => { if (e.target === o) o.remove(); });
  document.getElementById('modal-root').appendChild(o);
  return o;
}
function closeModal() { document.querySelector('.modal-overlay')?.remove(); }

function showImage(url) {
  const o = document.createElement('div');
  o.className = 'image-viewer';
  o.innerHTML = `<img src="${url}">`;
  o.addEventListener('click', () => o.remove());
  document.getElementById('image-viewer-root').appendChild(o);
}

function isMobile() { return window.innerWidth <= 768; }

// ═══ 认证 ═══
async function init() {
  // 检查邀请链接
  const hash = location.hash;
  if (hash.startsWith('#join/')) {
    const code = hash.slice(6);
    if (S.token) {
      try {
        const info = await api.getInviteInfo(code);
        showJoinModal(code, info);
      } catch (e) {
        toast(e.message, 'error');
      }
    } else {
      sessionStorage.setItem('pendingInvite', code);
      toast('请先登录，然后加入群聊');
    }
  }

  if (S.token) {
    try {
      S.user = (await api.getMe()).user;
      renderApp(); connectWS(); loadNotifs();
      // 登录后检查待处理的邀请
      const pending = sessionStorage.getItem('pendingInvite');
      if (pending) {
        sessionStorage.removeItem('pendingInvite');
        const info = await api.getInviteInfo(pending);
        showJoinModal(pending, info);
      }
    } catch {
      S.token = null; localStorage.removeItem('token'); renderAuth();
    }
  } else {
    renderAuth();
  }
}

function renderAuth() {
  document.getElementById('app').innerHTML = `
    <div class="auth-page">
      <div class="auth-bg"></div>
      <div class="auth-card">
        <div class="auth-logo">S</div>
        <div class="auth-title">SEEDCHAT</div>
        <div class="auth-sub">丐帮 | beggarhub 我的世界工作室官方论坛</div>
        <div class="auth-tabs">
          <button class="auth-tab active" id="tab-login" onclick="switchTab('login')">登录</button>
          <button class="auth-tab" id="tab-register" onclick="switchTab('register')">注册</button>
        </div>
        <div id="auth-form"></div>
      </div>
    </div>`;
  switchTab('login');
}

function switchTab(t) {
  document.getElementById('tab-login').classList.toggle('active', t === 'login');
  document.getElementById('tab-register').classList.toggle('active', t === 'register');
  const f = document.getElementById('auth-form');
  if (t === 'login') {
    f.innerHTML = `
      <div class="form-group"><label class="form-label">用户名</label><input class="form-input" id="li-u" placeholder="输入用户名" onkeydown="if(event.key==='Enter')doLogin()"></div>
      <div class="form-group"><label class="form-label">密码</label><input class="form-input" id="li-p" type="password" placeholder="输入密码" onkeydown="if(event.key==='Enter')doLogin()"></div>
      <div id="auth-err"></div>
      <button class="btn btn-primary btn-block mt-4" onclick="doLogin()">登录</button>`;
  } else {
    f.innerHTML = `
      <div class="form-group"><label class="form-label">用户名</label><input class="form-input" id="rg-u" placeholder="3-20个字符"></div>
      <div class="form-group"><label class="form-label">昵称</label><input class="form-input" id="rg-n" placeholder="你的昵称"></div>
      <div class="form-group"><label class="form-label">密码</label><input class="form-input" id="rg-p" type="password" placeholder="至少6位"></div>
      <div id="auth-err"></div>
      <button class="btn btn-primary btn-block mt-4" onclick="doRegister()">注册</button>`;
  }
}

async function doLogin() {
  const u = document.getElementById('li-u').value.trim();
  const p = document.getElementById('li-p').value;
  if (!u || !p) return;
  try {
    const d = await api.login({ username: u, password: p });
    S.token = d.token; S.user = d.user; localStorage.setItem('token', d.token);
    renderApp(); connectWS(); loadNotifs();
    const pending = sessionStorage.getItem('pendingInvite');
    if (pending) { sessionStorage.removeItem('pendingInvite'); const info = await api.getInviteInfo(pending); showJoinModal(pending, info); }
    toast('登录成功', 'success');
  } catch (e) { document.getElementById('auth-err').innerHTML = `<div class="form-error">${e.message}</div>`; }
}

async function doRegister() {
  const u = document.getElementById('rg-u').value.trim();
  const n = document.getElementById('rg-n').value.trim();
  const p = document.getElementById('rg-p').value;
  if (!u || !n || !p) return;
  try {
    const d = await api.register({ username: u, nickname: n, password: p });
    S.token = d.token; S.user = d.user; localStorage.setItem('token', d.token);
    renderApp(); connectWS(); toast('注册成功，欢迎加入', 'success');
  } catch (e) { document.getElementById('auth-err').innerHTML = `<div class="form-error">${e.message}</div>`; }
}

async function doLogout() {
  try { await api.logout(); } catch {}
  S.token = null; S.user = null; localStorage.removeItem('token');
  if (S.ws) S.ws.close();
  renderAuth();
}

// ═══ 应用框架 ═══
function renderApp() {
  document.getElementById('app').innerHTML = `
    <div class="layout">
      <main class="main" id="main-content"></main>
    </div>
    <!-- 悬浮球导航 -->
    <div class="fab-overlay" id="fab-overlay" onclick="toggleFab(false)"></div>
    <button class="fab" id="fab" onclick="toggleFab()" aria-label="菜单">
      ${I.plus}
      <span class="fab-badge hidden" id="fab-notif">0</span>
    </button>
    <div class="fab-menu" id="fab-menu">
      <div class="fab-menu-header" onclick="navigate('settings'); toggleFab(false)">
        ${avatarHtml(S.user)}
        <div style="min-width:0;flex:1">
          <div class="fab-menu-name">${esc(S.user.nickname)}</div>
          <div class="fab-menu-status"><span class="status-dot online"></span> 在线</div>
        </div>
      </div>
      <div id="fab-nav"></div>
    </div>`;

  // 导航项
  const navItems = [
    { view: 'forum', label: '论坛', icon: I.home },
    { view: 'messages', label: '私信', icon: I.chat },
    { view: 'groups', label: '群聊', icon: I.users },
    { view: 'friends', label: '好友', icon: I.userPlus },
    { view: 'notifications', label: '通知', icon: I.bell, badge: 'fab-notif' },
    { view: 'settings', label: '设置', icon: I.settings },
  ];

  document.getElementById('fab-nav').innerHTML = navItems.map(n => `
    <div class="fab-menu-item ${n.view === S.view ? 'active' : ''}" data-view="${n.view}" onclick="navigate('${n.view}'); toggleFab(false)">
      ${n.icon}<span>${n.label}</span>
      ${n.badge ? `<span class="nav-badge hidden" id="${n.badge}">0</span>` : ''}
    </div>`).join('');

  navigate('forum');
}

function navigate(v) {
  S.view = v;
  toggleFab(false);
  document.querySelectorAll('[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === v));
  ({ forum: renderForum, messages: renderMessages, groups: renderGroups, friends: renderFriends,
     notifications: renderNotifications, settings: renderSettings })[v]?.();
}

function toggleFab(open) {
  const fab = document.getElementById('fab');
  const menu = document.getElementById('fab-menu');
  const overlay = document.getElementById('fab-overlay');
  if (open === undefined) open = !fab.classList.contains('open');
  fab.classList.toggle('open', open);
  menu.classList.toggle('open', open);
  overlay.classList.toggle('open', open);
}

function pageHeader(title, actions = '') {
  return `<div class="page-inline-header">
    <span class="page-inline-title">${title}</span>
    <div class="flex gap-2">${actions}</div>
  </div>`;
}

// ═══ 论坛 ═══
async function renderForum() {
  document.getElementById('main-content').innerHTML = `
    ${pageHeader('论坛', `<button class="btn btn-primary btn-sm" onclick="showCreatePost()">${I.plus}<span>发帖</span></button>`)}
    <div class="page-body" id="forum-body">${Array(3).fill('<div class="skeleton skeleton-card"></div>').join('')}</div>`;
  try {
    const d = await api.getPosts();
    renderPostList(d.posts);
  } catch (e) {
    document.getElementById('forum-body').innerHTML = emptyState(I.alert, e.message);
  }
}

function renderPostList(posts) {
  const b = document.getElementById('forum-body');
  if (!posts.length) { b.innerHTML = emptyState(I.home, '还没有帖子，快来发第一帖'); return; }
  b.innerHTML = posts.map((p, i) => `
    <div class="post-card ${p.pinned ? 'pinned' : ''}" style="animation-delay:${i * 0.05}s" onclick="viewPost(${p.id})">
      <div class="post-header">
        ${avatarHtml({ nickname: p.nickname, avatar: p.avatar })}
        <div class="post-author">
          <div class="post-author-name">${esc(p.nickname)}</div>
          <div class="post-author-meta">${fmtTime(p.created_at)} · ${I.eye.replace('width="', 'style="width:14px;height:14px" width="')} ${p.views}</div>
        </div>
        ${p.pinned ? `<span class="pin-badge">${I.pin}置顶</span>` : ''}
      </div>
      <div class="post-title">${esc(p.title)}</div>
      <div class="post-content">${esc(p.content)}</div>
      ${p.images?.length ? `<div class="post-images">${p.images.slice(0, 4).map(img => `<img class="post-image" src="${img}" onclick="event.stopPropagation();showImage('${img}')">`).join('')}</div>` : ''}
      <div class="post-footer">
        <button class="post-action ${p.liked ? 'liked' : ''}" onclick="event.stopPropagation();toggleLike(${p.id},${p.liked})">
          ${p.liked ? I.heartFill : I.heart} ${p.like_count}
        </button>
        <button class="post-action" onclick="event.stopPropagation();viewPost(${p.id})">${I.comment} ${p.comment_count}</button>
        <button class="post-action" onclick="event.stopPropagation();sharePost(${p.id},'${esc(p.title)}')">${I.share} 分享</button>
      </div>
    </div>`).join('');
}

async function viewPost(id) {
  S.postId = id;
  document.getElementById('main-content').innerHTML = `
    ${pageHeader('帖子详情', `<button class="btn btn-ghost btn-icon" onclick="renderForum()">${I.back}</button>`)}
    <div class="page-body" id="post-body"><div class="spinner"></div></div>`;
  try {
    const [post, comments] = await Promise.all([api.getPost(id), api.getComments(id)]);
    renderPostDetail(post, comments.comments);
  } catch (e) { document.getElementById('post-body').innerHTML = emptyState(I.alert, e.message); }
}

function renderPostDetail(p, comments) {
  const mine = S.user?.id === p.user_id;
  document.getElementById('post-body').innerHTML = `
    <div class="post-card" style="cursor:default">
      <div class="post-header">
        ${avatarHtml({ nickname: p.nickname, avatar: p.avatar })}
        <div class="post-author">
          <div class="post-author-name">${esc(p.nickname)}</div>
          <div class="post-author-meta">${fmtTime(p.created_at)} · ${p.views} 浏览</div>
        </div>
        ${p.pinned ? `<span class="pin-badge">${I.pin}置顶</span>` : ''}
        ${mine ? `<div class="flex gap-2"><button class="btn btn-ghost btn-sm" onclick="showEditPost(${p.id})">${I.edit}</button><button class="btn btn-ghost btn-sm text-danger" onclick="delPost(${p.id})">${I.trash}</button></div>` : ''}
      </div>
      <div class="post-title" style="font-size:22px">${esc(p.title)}</div>
      <div class="post-content" style="max-height:none">${esc(p.content)}</div>
      ${p.images?.length ? `<div class="post-images" style="margin-top:16px">${p.images.map(img => `<img class="post-image" style="width:140px;height:140px" src="${img}" onclick="showImage('${img}')">`).join('')}</div>` : ''}
      <div class="post-footer">
        <button class="post-action ${p.liked ? 'liked' : ''}" onclick="toggleLike(${p.id},${p.liked})">${p.liked ? I.heartFill : I.heart} ${p.like_count}</button>
        <button class="post-action">${I.comment} ${p.comment_count}</button>
        <button class="post-action" onclick="sharePost(${p.id},'${esc(p.title)}')">${I.share} 分享</button>
      </div>
    </div>
    <div class="card">
      <div class="font-bold mb-4">评论 (${comments.length})</div>
      <div class="flex gap-2 mb-4">
        <input class="form-input" id="cmt-input" placeholder="写下你的评论..." onkeydown="if(event.key==='Enter')submitComment(${p.id})">
        <button class="btn btn-primary" onclick="submitComment(${p.id})">${I.send}</button>
      </div>
      <div id="cmt-list">${comments.length ? comments.map(c => `
        <div class="comment-item">
          ${avatarHtml({ nickname: c.nickname, avatar: c.avatar }, 'sm')}
          <div class="comment-body">
            <div class="comment-author">${esc(c.nickname)} ${c.user_id === S.user?.id ? `<button class="btn btn-ghost btn-sm text-danger" style="float:right;padding:2px 8px" onclick="delComment(${c.id})">${I.trash}</button>` : ''}</div>
            <div class="comment-text">${esc(c.content)}</div>
            <div class="comment-time">${fmtTime(c.created_at)}</div>
          </div>
        </div>`).join('') : `<div class="text-center text-muted text-sm">暂无评论</div>`}
      </div>
    </div>`;
}

async function toggleLike(id, liked) {
  try { liked ? await api.unlikePost(id) : await api.likePost(id); viewPost(id); if (S.view === 'forum') setTimeout(renderForum, 100); }
  catch (e) { toast(e.message, 'error'); }
}

function sharePost(id, title) {
  const url = `${location.origin}/?post=${id}`;
  navigator.clipboard.writeText(url).then(() => toast('链接已复制', 'success')).catch(() => {
    showModal(`<div class="modal-header"><div class="modal-title">分享帖子</div><button class="modal-close" onclick="closeModal()">${I.close}</button></div>
    <p class="text-muted text-sm mb-4">复制链接分享给好友：</p>
    <input class="form-input" value="${url}" readonly onclick="this.select()">`);
  });
}

async function submitComment(postId) {
  const i = document.getElementById('cmt-input'); const c = i.value.trim(); if (!c) return;
  try { await api.createComment(postId, { content: c }); viewPost(postId); } catch (e) { toast(e.message, 'error'); }
}

async function delComment(id) {
  if (!confirm('确定删除这条评论？')) return;
  try { await api.deleteComment(id); viewPost(S.postId); toast('已删除', 'success'); } catch (e) { toast(e.message, 'error'); }
}

async function delPost(id) {
  if (!confirm('确定删除这篇帖子？')) return;
  try { await api.deletePost(id); renderForum(); toast('已删除', 'success'); } catch (e) { toast(e.message, 'error'); }
}

function showCreatePost() {
  S.tempImages = [];
  showModal(`
    <div class="modal-header"><div class="modal-title">发帖</div><button class="modal-close" onclick="closeModal()">${I.close}</button></div>
    <div class="form-group"><label class="form-label">标题</label><input class="form-input" id="p-title" placeholder="帖子标题"></div>
    <div class="form-group"><label class="form-label">内容</label><textarea class="form-textarea" id="p-content" placeholder="写下你想说的..." style="min-height:160px"></textarea></div>
    <div class="form-group"><label class="form-label">图片（可选，自动压缩）</label>
      <input type="file" id="p-imgs" accept="image/*" multiple style="font-size:14px">
      <div id="p-img-preview" class="post-images" style="margin-top:8px"></div>
    </div>
    <button class="btn btn-primary btn-block mt-4" id="p-submit" onclick="submitPost()">发布</button>`);
  document.getElementById('p-imgs').addEventListener('change', async e => {
    const prev = document.getElementById('p-img-preview');
    prev.innerHTML = '<div class="text-sm text-muted">压缩中...</div>';
    S.tempImages = [];
    for (const f of Array.from(e.target.files)) {
      try { S.tempImages.push(await uploadImg(f)); } catch (err) { toast('上传失败', 'error'); }
    }
    prev.innerHTML = S.tempImages.map(u => `<img class="post-image" src="${u}" onclick="showImage('${u}')">`).join('');
  });
}

async function submitPost() {
  const t = document.getElementById('p-title').value.trim();
  const c = document.getElementById('p-content').value.trim();
  if (!t || !c) { toast('标题和内容不能为空', 'error'); return; }
  const btn = document.getElementById('p-submit'); btn.disabled = true; btn.textContent = '发布中...';
  try {
    await api.createPost({ title: t, content: c, images: S.tempImages });
    closeModal(); renderForum(); toast('发布成功', 'success');
  } catch (e) { toast(e.message, 'error'); btn.disabled = false; btn.textContent = '发布'; }
}

async function showEditPost(id) {
  const p = await api.getPost(id);
  showModal(`
    <div class="modal-header"><div class="modal-title">编辑帖子</div><button class="modal-close" onclick="closeModal()">${I.close}</button></div>
    <div class="form-group"><label class="form-label">标题</label><input class="form-input" id="e-title" value="${esc(p.title)}"></div>
    <div class="form-group"><label class="form-label">内容</label><textarea class="form-textarea" id="e-content" style="min-height:160px">${esc(p.content)}</textarea></div>
    <button class="btn btn-primary btn-block" onclick="submitEditPost(${id})">保存</button>`);
}

async function submitEditPost(id) {
  const t = document.getElementById('e-title').value.trim();
  const c = document.getElementById('e-content').value.trim();
  try { await api.editPost(id, { title: t, content: c, images: [] }); closeModal(); viewPost(id); toast('已修改', 'success'); }
  catch (e) { toast(e.message, 'error'); }
}

function onNewPost(d) {
  toast(`新帖子：${d.title}`, 'success');
  if (S.view === 'forum') setTimeout(renderForum, 500);
}

// ═══ 私信 ═══
async function renderMessages() {
  document.getElementById('main-content').innerHTML = `
    ${pageHeader('私信')}
    <div class="chat-layout">
      <div class="chat-sidebar" id="chat-side">
        <div class="chat-search"><input class="form-input" id="chat-search" placeholder="搜索用户..." oninput="searchChat(this.value)"><div id="chat-results"></div></div>
        <div class="chat-list" id="chat-list"><div class="spinner"></div></div>
      </div>
      <div class="chat-main chat-hidden" id="chat-main"><div class="chat-empty">${I.chat}<div>选择一个会话开始聊天</div></div></div>
    </div>`;
  S.chatMode = 'private'; loadConversations();
}

async function loadConversations() {
  try {
    const d = await api.getConversations();
    const l = document.getElementById('chat-list');
    if (!d.conversations.length) { l.innerHTML = emptyState(I.chat, '暂无会话<br>搜索用户开始聊天'); return; }
    l.innerHTML = d.conversations.map(c => `
      <div class="chat-list-item" onclick="openChat(${c.peer_id})">
        ${avatarHtml({ nickname: c.nickname, avatar: c.avatar })}
        <div class="chat-list-item-info">
          <div class="chat-list-item-name">${esc(c.nickname)}</div>
          <div class="chat-list-item-preview">${c.recalled ? '消息已撤回' : esc(c.content)}</div>
        </div>
      </div>`).join('');
  } catch {}
}

async function searchChat(q) {
  const r = document.getElementById('chat-results');
  if (!q.trim()) { r.innerHTML = ''; return; }
  try {
    const d = await api.searchUsers(q);
    r.innerHTML = d.users.map(u => `
      <div class="chat-list-item" onclick="openChat(${u.id})">
        ${avatarHtml(u, 'sm')}
        <div class="chat-list-item-info"><div class="chat-list-item-name">${esc(u.nickname)}</div><div class="chat-list-item-preview">@${esc(u.username)}</div></div>
      </div>`).join('');
  } catch {}
}

async function openChat(peerId) {
  S.chatPeer = peerId; S.chatMode = 'private';
  if (isMobile()) { document.getElementById('chat-side').classList.add('chat-hidden'); document.getElementById('chat-main').classList.remove('chat-hidden'); }
  try {
    const d = await api.getMessages(peerId);
    S.messages[peerId] = d.messages;
    document.getElementById('chat-main').innerHTML = `
      <div class="chat-header">
        ${avatarHtml(d.peer)}
        <div><div class="font-bold">${esc(d.peer.nickname)}</div><div class="text-xs text-muted flex items-center gap-2"><span class="status-dot ${d.peer.status === 'online' ? 'online' : ''}"></span>${d.peer.status === 'online' ? '在线' : '离线'}</div></div>
        <div class="flex-1"></div>
        <button class="btn btn-ghost btn-icon" onclick="showChatMenu(${peerId})">${I.more}</button>
        ${isMobile() ? `<button class="btn btn-ghost btn-icon" onclick="backToChatList()">${I.back}</button>` : ''}
      </div>
      <div class="chat-messages" id="chat-msgs">${d.messages.map(m => msgHtml(m, S.user.id)).join('')}</div>
      <div class="chat-input">
        <label class="cursor-pointer"><input type="file" accept="image/*" style="display:none" onchange="sendChatImg(this,${peerId})">${I.image}</label>
        <input class="chat-input-field" id="chat-field" placeholder="输入消息..." onkeydown="if(event.key==='Enter')sendChatMsg(${peerId})">
        <button class="btn btn-primary btn-icon" onclick="sendChatMsg(${peerId})">${I.send}</button>
      </div>`;
    scrollChat();
  } catch (e) { toast(e.message, 'error'); }
}

function backToChatList() {
  document.getElementById('chat-side').classList.remove('chat-hidden');
  document.getElementById('chat-main').classList.add('chat-hidden');
}

function msgHtml(m, myId) {
  const mine = m.from_id === myId;
  if (m.recalled) return `<div class="msg-bubble recalled">${mine ? '你' : '对方'}撤回了一条消息</div>`;
  const content = m.msg_type === 'image' ? `<img class="msg-img" src="${m.content}" onclick="showImage('${m.content}')">` : esc(m.content);
  return `<div class="msg-row ${mine ? 'mine' : ''}">
    <div class="msg-bubble ${mine ? 'mine' : 'theirs'}">
      ${mine ? `<div class="msg-actions"><button class="msg-action-btn" onclick="recallMsg(${m.id})">撤回</button></div>` : ''}
      ${content}
    </div><div class="msg-time">${fmtTime(m.created_at)}</div>
  </div>`;
}

function scrollChat() { const e = document.getElementById('chat-msgs'); if (e) e.scrollTop = e.scrollHeight; }

async function sendChatMsg(peerId) {
  const f = document.getElementById('chat-field'); const c = f.value.trim(); if (!c) return; f.value = '';
  try {
    const d = await api.sendMessage({ toId: peerId, content: c });
    S.messages[peerId] = S.messages[peerId] || []; S.messages[peerId].push(d.message);
    document.getElementById('chat-msgs').insertAdjacentHTML('beforeend', msgHtml(d.message, S.user.id)); scrollChat();
  } catch (e) { toast(e.message, 'error'); }
}

async function sendChatImg(input, peerId) {
  const f = input.files[0]; if (!f) return; input.value = '';
  try {
    toast('图片上传中...'); const url = await uploadImg(f);
    const d = await api.sendMessage({ toId: peerId, content: url, msgType: 'image' });
    S.messages[peerId] = S.messages[peerId] || []; S.messages[peerId].push(d.message);
    document.getElementById('chat-msgs').insertAdjacentHTML('beforeend', msgHtml(d.message, S.user.id)); scrollChat();
  } catch (e) { toast(e.message, 'error'); }
}

async function recallMsg(id) {
  try { await api.recallMessage(id); openChat(S.chatPeer); toast('已撤回', 'success'); }
  catch (e) { toast(e.message, 'error'); }
}

function onPrivMsg(d) {
  if (S.chatMode === 'private' && S.chatPeer === d.fromId) {
    const m = { id: d.msgId, from_id: d.fromId, to_id: S.user.id, content: d.content, msg_type: d.msgType, recalled: 0, created_at: Math.floor(d.timestamp / 1000) };
    S.messages[d.fromId] = S.messages[d.fromId] || []; S.messages[d.fromId].push(m);
    document.getElementById('chat-msgs')?.insertAdjacentHTML('beforeend', msgHtml(m, S.user.id)); scrollChat();
  } else { toast('收到新消息'); loadConversations(); }
}

function showChatMenu(peerId) {
  showModal(`<div class="modal-header"><div class="modal-title">聊天选项</div><button class="modal-close" onclick="closeModal()">${I.close}</button></div>
  <div class="flex flex-col gap-2">
    <button class="btn btn-ghost btn-block" onclick="closeModal();navigate('friends')">${I.user} 查看资料</button>
    <button class="btn btn-ghost btn-block text-danger" onclick="closeModal();addBlacklist(${peerId})">${I.ban} 加入黑名单</button>
  </div>`);
}

// ═══ 群聊 ═══
async function renderGroups() {
  document.getElementById('main-content').innerHTML = `
    ${pageHeader('群聊', `<button class="btn btn-primary btn-sm" onclick="showCreateGroup()">${I.plus}建群</button>`)}
    <div class="chat-layout">
      <div class="chat-sidebar" id="grp-side"><div class="chat-list" id="grp-list"><div class="spinner"></div></div></div>
      <div class="chat-main chat-hidden" id="chat-main"><div class="chat-empty">${I.users}<div>选择群聊开始聊天</div></div></div>
    </div>`;
  S.chatMode = 'group'; loadGroups();
}

async function loadGroups() {
  try {
    const d = await api.getGroups();
    const l = document.getElementById('grp-list');
    if (!d.groups.length) { l.innerHTML = emptyState(I.users, '还没有群聊<br>点击建群创建'); return; }
    l.innerHTML = d.groups.map(g => `
      <div class="chat-list-item" onclick="openGroup(${g.id})">
        <div class="avatar">${esc(g.name[0])}</div>
        <div class="chat-list-item-info">
          <div class="chat-list-item-name">${esc(g.name)}</div>
          <div class="chat-list-item-preview">${g.member_count} 人 · ${g.role === 'owner' ? '群主' : g.role === 'admin' ? '管理员' : '成员'}</div>
        </div>
      </div>`).join('');
  } catch {}
}

async function openGroup(gid) {
  S.groupId = gid; S.chatMode = 'group';
  if (isMobile()) { document.getElementById('grp-side').classList.add('chat-hidden'); document.getElementById('chat-main').classList.remove('chat-hidden'); }
  try {
    const [gd, md] = await Promise.all([api.getGroup(gid), api.getGroupMessages(gid)]);
    S.groupMessages[gid] = md.messages;
    renderGroupChat(gd, md.messages);
  } catch (e) { toast(e.message, 'error'); }
}

function renderGroupChat(gd, msgs) {
  const g = gd.group;
  document.getElementById('chat-main').innerHTML = `
    <div class="chat-header">
      <div class="avatar">${esc(g.name[0])}</div>
      <div><div class="font-bold">${esc(g.name)}</div><div class="text-xs text-muted">${gd.members.length} 人</div></div>
      <div class="flex-1"></div>
      <button class="btn btn-ghost btn-icon" onclick="showGroupMenu(${g.id})">${I.settings}</button>
      ${isMobile() ? `<button class="btn btn-ghost btn-icon" onclick="backToGroupList()">${I.back}</button>` : ''}
    </div>
    <div class="chat-messages" id="chat-msgs">${msgs.map(m => grpMsgHtml(m, S.user.id)).join('')}</div>
    <div class="chat-input">
      <label class="cursor-pointer"><input type="file" accept="image/*" style="display:none" onchange="sendGrpImg(this,${g.id})">${I.image}</label>
      <input class="chat-input-field" id="chat-field" placeholder="输入消息..." onkeydown="if(event.key==='Enter')sendGrpMsg(${g.id})">
      <button class="btn btn-primary btn-icon" onclick="sendGrpMsg(${g.id})">${I.send}</button>
    </div>`;
  scrollChat();
}

function backToGroupList() {
  document.getElementById('grp-side').classList.remove('chat-hidden');
  document.getElementById('chat-main').classList.add('chat-hidden');
}

function grpMsgHtml(m, myId) {
  const mine = m.from_id === myId;
  if (m.recalled) return `<div class="msg-bubble recalled">${esc(m.nickname)}撤回了一条消息</div>`;
  const content = m.msg_type === 'image' ? `<img class="msg-img" src="${m.content}" onclick="showImage('${m.content}')">` : esc(m.content);
  return `<div class="msg-row ${mine ? 'mine' : ''}">
    ${!mine ? `<div class="msg-name">${esc(m.nickname)}</div>` : ''}
    <div class="msg-bubble ${mine ? 'mine' : 'theirs'}">
      ${mine ? `<div class="msg-actions"><button class="msg-action-btn" onclick="recallGrpMsg(${m.group_id},${m.id})">撤回</button></div>` : ''}
      ${content}
    </div><div class="msg-time">${fmtTime(m.created_at)}</div>
  </div>`;
}

async function sendGrpMsg(gid) {
  const f = document.getElementById('chat-field'); const c = f.value.trim(); if (!c) return; f.value = '';
  try {
    const d = await api.sendGroupMessage(gid, { content: c });
    S.groupMessages[gid] = S.groupMessages[gid] || []; S.groupMessages[gid].push(d.message);
    document.getElementById('chat-msgs').insertAdjacentHTML('beforeend', grpMsgHtml(d.message, S.user.id)); scrollChat();
  } catch (e) { toast(e.message, 'error'); }
}

async function sendGrpImg(input, gid) {
  const f = input.files[0]; if (!f) return; input.value = '';
  try {
    toast('图片上传中...'); const url = await uploadImg(f);
    const d = await api.sendGroupMessage(gid, { content: url, msgType: 'image' });
    S.groupMessages[gid] = S.groupMessages[gid] || []; S.groupMessages[gid].push(d.message);
    document.getElementById('chat-msgs').insertAdjacentHTML('beforeend', grpMsgHtml(d.message, S.user.id)); scrollChat();
  } catch (e) { toast(e.message, 'error'); }
}

async function recallGrpMsg(gid, mid) {
  try { await api.recallGroupMessage(gid, mid); openGroup(gid); toast('已撤回', 'success'); }
  catch (e) { toast(e.message, 'error'); }
}

function onGroupMsg(d) {
  if (S.chatMode === 'group' && S.groupId === d.groupId) {
    const m = { id: d.msgId, group_id: d.groupId, from_id: d.fromId, nickname: d.fromName, avatar: d.fromAvatar, content: d.content, msg_type: d.msgType, recalled: 0, created_at: Math.floor(d.timestamp / 1000) };
    S.groupMessages[d.groupId] = S.groupMessages[d.groupId] || []; S.groupMessages[d.groupId].push(m);
    document.getElementById('chat-msgs')?.insertAdjacentHTML('beforeend', grpMsgHtml(m, S.user.id)); scrollChat();
  } else { toast('收到新群消息'); }
}

function showCreateGroup() {
  S.selectedMembers = [];
  showModal(`<div class="modal-header"><div class="modal-title">创建群聊</div><button class="modal-close" onclick="closeModal()">${I.close}</button></div>
    <div class="form-group"><label class="form-label">群名称</label><input class="form-input" id="g-name" placeholder="群名称"></div>
    <div class="form-group"><label class="form-label">群描述（可选）</label><input class="form-input" id="g-desc" placeholder="群描述"></div>
    <div class="form-group"><label class="form-label">添加成员</label><input class="form-input" id="g-search" placeholder="搜索好友..." oninput="searchFriendsGroup(this.value)"><div id="g-results" style="margin-top:8px"></div><div id="g-selected" style="margin-top:8px"></div></div>
    <button class="btn btn-primary btn-block mt-4" onclick="submitCreateGroup()">创建</button>`);
  searchFriendsGroup('');
}

async function searchFriendsGroup(q) {
  try {
    const d = await api.getFriends();
    const friends = q ? d.friends.filter(f => f.nickname.includes(q) || f.username.includes(q)) : d.friends;
    document.getElementById('g-results').innerHTML = friends.map(f => `
      <div class="list-item" style="padding:8px" onclick="toggleMember(${f.id},'${esc(f.nickname)}')">
        ${avatarHtml(f, 'sm')}<div class="list-item-info"><div class="list-item-name">${esc(f.nickname)}</div></div>
        <button class="btn btn-ghost btn-sm">${I.plus}</button>
      </div>`).join('');
  } catch {}
}

function toggleMember(id, name) {
  const i = S.selectedMembers.findIndex(m => m.id === id);
  if (i >= 0) S.selectedMembers.splice(i, 1); else S.selectedMembers.push({ id, name });
  document.getElementById('g-selected').innerHTML = S.selectedMembers.map(m =>
    `<span class="pin-badge" style="cursor:pointer;margin-right:4px" onclick="toggleMember(${m.id},'${m.name}')">${esc(m.name)} ${I.close}</span>`).join('');
}

async function submitCreateGroup() {
  const name = document.getElementById('g-name').value.trim();
  if (!name) { toast('群名不能为空', 'error'); return; }
  try {
    await api.createGroup({ name, description: document.getElementById('g-desc').value.trim(), memberIds: S.selectedMembers.map(m => m.id) });
    closeModal(); renderGroups(); toast('群聊创建成功', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

async function showGroupMenu(gid) {
  try {
    const gd = await api.getGroup(gid);
    const g = gd.group; const members = gd.members;
    const myRole = members.find(m => m.id === S.user.id)?.role;
    const isOwner = myRole === 'owner';
    showModal(`<div class="modal-header"><div class="modal-title">${esc(g.name)}</div><button class="modal-close" onclick="closeModal()">${I.close}</button></div>
      ${g.description ? `<p class="text-sm text-2 mb-4">${esc(g.description)}</p>` : ''}
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <div class="font-bold">群成员 (${members.length})</div>
          <button class="btn btn-primary btn-sm" onclick="showInviteLink(${gid})">${I.link} 邀请链接</button>
        </div>
        ${members.map(m => `
          <div class="list-item" style="padding:8px">
            ${avatarHtml(m, 'sm')}
            <div class="list-item-info"><div class="list-item-name">${esc(m.nickname)}</div><div class="text-xs text-muted">${m.role === 'owner' ? '群主' : m.role === 'admin' ? '管理员' : '成员'}</div></div>
            ${isOwner && m.id !== S.user.id ? `<button class="btn btn-ghost btn-sm text-danger" onclick="rmMember(${gid},${m.id})">${I.trash}</button>` : ''}
          </div>`).join('')}
      </div>
      <div class="flex flex-col gap-2">
        ${isOwner ? `<button class="btn btn-danger btn-block" onclick="confirmDelGroup(${gid})">${I.trash} 解散群聊</button>` : `<button class="btn btn-danger btn-block" onclick="confirmLeaveGroup(${gid})">退出群聊</button>`}
      </div>`);
  } catch (e) { toast(e.message, 'error'); }
}

async function showInviteLink(gid) {
  try {
    const d = await api.createInvite(gid);
    closeModal();
    showModal(`<div class="modal-header"><div class="modal-title">${I.link} 群邀请链接</div><button class="modal-close" onclick="closeModal()">${I.close}</button></div>
      <p class="text-sm text-2 mb-4">分享此链接给好友，他们点击即可加入群聊：</p>
      <div class="flex gap-2 mb-4">
        <input class="form-input" id="invite-url" value="${d.url}" readonly onclick="this.select()">
        <button class="btn btn-primary" onclick="copyInvite()">${I.copy} 复制</button>
      </div>
      <div class="card" style="background:var(--surface-2);padding:14px">
        <div class="text-sm text-2 mb-2">邀请码：<span class="font-bold text-primary">${d.code}</span></div>
        <div class="text-xs text-muted">链接永久有效，任何人点击即可加群</div>
      </div>`);
  } catch (e) { toast(e.message, 'error'); }
}

function copyInvite() {
  const url = document.getElementById('invite-url').value;
  navigator.clipboard.writeText(url).then(() => toast('链接已复制', 'success'));
}

function showJoinModal(code, info) {
  if (info.isMember) { toast('你已经是群成员了'); navigate('groups'); setTimeout(() => openGroup(info.groupId), 300); return; }
  showModal(`<div class="modal-header"><div class="modal-title">${I.users} 加入群聊</div><button class="modal-close" onclick="closeModal()">${I.close}</button></div>
    <div class="text-center" style="padding:20px 0">
      <div class="avatar avatar-xl" style="margin:0 auto 16px">${esc(info.name[0])}</div>
      <div class="font-bold" style="font-size:20px">${esc(info.name)}</div>
      ${info.description ? `<p class="text-sm text-2 mt-2">${esc(info.description)}</p>` : ''}
      <div class="text-xs text-muted mt-2">${info.memberCount} 位成员</div>
    </div>
    <button class="btn btn-primary btn-block" onclick="joinGroupByCode('${code}', ${info.groupId})">${I.userPlus} 加入群聊</button>`);
}

async function joinGroupByCode(code, gid) {
  try {
    await api.joinGroup(code);
    closeModal(); navigate('groups'); setTimeout(() => openGroup(gid), 300);
    toast('加入成功', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

async function rmMember(gid, uid) {
  try { await api.removeGroupMember(gid, uid); closeModal(); openGroup(gid); toast('已移除', 'success'); }
  catch (e) { toast(e.message, 'error'); }
}

async function confirmLeaveGroup(gid) {
  if (!confirm('确定退出群聊？')) return;
  try { await api.leaveGroup(gid); closeModal(); renderGroups(); toast('已退出', 'success'); }
  catch (e) { toast(e.message, 'error'); }
}

async function confirmDelGroup(gid) {
  if (!confirm('确定解散群聊？此操作不可恢复。')) return;
  try { await api.deleteGroup(gid); closeModal(); renderGroups(); toast('已解散', 'success'); }
  catch (e) { toast(e.message, 'error'); }
}

// ═══ 好友 ═══
async function renderFriends() {
  document.getElementById('main-content').innerHTML = `
    ${pageHeader('好友')}
    <div class="page-body">
      <div class="mb-4"><input class="form-input" id="f-search" placeholder="搜索用户添加好友..." oninput="searchUsersAdd(this.value)"></div>
      <div id="f-results"></div>
      <div class="flex gap-2 mb-4 mt-6">
        <button class="btn btn-primary btn-sm" onclick="loadFriendList()">好友列表</button>
        <button class="btn btn-ghost btn-sm" onclick="loadFriendReqs()">好友请求</button>
      </div>
      <div id="f-content"><div class="spinner"></div></div>
    </div>`;
  loadFriendList();
}

async function loadFriendList() {
  try {
    const d = await api.getFriends();
    const c = document.getElementById('f-content');
    if (!d.friends.length) { c.innerHTML = emptyState(I.userPlus, '还没有好友<br>搜索用户名添加'); return; }
    c.innerHTML = d.friends.map((f, i) => `
      <div class="card flex items-center gap-3" style="animation-delay:${i * 0.04}s">
        ${avatarHtml(f)}
        <div class="flex-1"><div class="font-bold">${esc(f.nickname)}</div><div class="text-xs text-muted">@${esc(f.username)} · <span class="status-dot ${f.status === 'online' ? 'online' : ''}"></span> ${f.status === 'online' ? '在线' : '离线'}</div></div>
        <button class="btn btn-primary btn-sm" onclick="navigate('messages');setTimeout(()=>openChat(${f.id}),300)">${I.chat}</button>
        <button class="btn btn-ghost btn-sm text-danger" onclick="rmFriendConfirm(${f.id})">${I.close}</button>
      </div>`).join('');
  } catch (e) { toast(e.message, 'error'); }
}

async function loadFriendReqs() {
  try {
    const d = await api.getFriendRequests();
    const c = document.getElementById('f-content');
    if (!d.requests.length) { c.innerHTML = emptyState(I.bell, '暂无好友请求'); return; }
    c.innerHTML = d.requests.map((r, i) => `
      <div class="card flex items-center gap-3" style="animation-delay:${i * 0.04}s">
        ${avatarHtml(r)}
        <div class="flex-1"><div class="font-bold">${esc(r.nickname)}</div><div class="text-xs text-muted">@${esc(r.username)} · ${fmtTime(r.created_at)}</div></div>
        <button class="btn btn-primary btn-sm" onclick="acceptFriend(${r.id})">${I.check} 接受</button>
        <button class="btn btn-ghost btn-sm" onclick="rejectFriend(${r.id})">${I.x}</button>
      </div>`).join('');
  } catch (e) { toast(e.message, 'error'); }
}

async function searchUsersAdd(q) {
  const r = document.getElementById('f-results');
  if (!q.trim()) { r.innerHTML = ''; return; }
  try {
    const d = await api.searchUsers(q);
    r.innerHTML = d.users.map((u, i) => `
      <div class="card flex items-center gap-3" style="padding:12px;animation-delay:${i * 0.03}s">
        ${avatarHtml(u)}
        <div class="flex-1"><div class="font-bold">${esc(u.nickname)}</div><div class="text-xs text-muted">@${esc(u.username)}</div></div>
        <button class="btn btn-primary btn-sm" onclick="sendFriendReq(${u.id})">${I.userPlus} 添加</button>
      </div>`).join('');
  } catch {}
}

async function sendFriendReq(id) { try { await api.sendFriendRequest(id); toast('请求已发送', 'success'); } catch (e) { toast(e.message, 'error'); } }
async function acceptFriend(id) { try { await api.acceptFriend(id); loadFriendReqs(); toast('已添加', 'success'); } catch (e) { toast(e.message, 'error'); } }
async function rejectFriend(id) { try { await api.rejectFriend(id); loadFriendReqs(); } catch (e) { toast(e.message, 'error'); } }
async function rmFriendConfirm(id) {
  if (!confirm('确定删除这个好友？')) return;
  try { await api.removeFriend(id); loadFriendList(); toast('已删除', 'success'); } catch (e) { toast(e.message, 'error'); }
}

// ═══ 通知 ═══
async function renderNotifications() {
  document.getElementById('main-content').innerHTML = `
    ${pageHeader('通知', `<button class="btn btn-ghost btn-sm" onclick="markAllRead()">全部已读</button>`)}
    <div class="page-body" id="notif-body"><div class="spinner"></div></div>`;
  loadNotifs();
}

async function loadNotifs() {
  try {
    const d = await api.getNotifications();
    S.notifUnread = d.unread;
    ['fab-notif'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { if (d.unread > 0) { el.textContent = d.unread; el.classList.remove('hidden'); } else el.classList.add('hidden'); }
    });
    if (S.view === 'notifications') {
      const b = document.getElementById('notif-body');
      if (!d.notifications.length) { b.innerHTML = emptyState(I.bell, '暂无通知'); return; }
      const icons = { friend_request: I.userPlus, friend_accept: I.check, comment: I.comment, like: I.heart, group_invite: I.users };
      b.innerHTML = d.notifications.map((n, i) => `
        <div class="card ${n.read ? '' : 'cursor-pointer'}" style="${n.read ? 'opacity:0.6' : 'border-left:3px solid var(--primary)'};animation-delay:${i * 0.03}s" ${n.read ? '' : `onclick="readNotif(${n.id})"`}>
          <div class="flex items-center gap-3">
            <span style="color:var(--primary-light)">${icons[n.type] || I.bell}</span>
            <div class="flex-1"><div>${esc(n.content)}</div><div class="text-xs text-muted">${fmtTime(n.created_at)}</div></div>
            ${!n.read ? '<span class="pin-badge">新</span>' : ''}
          </div>
        </div>`).join('');
    }
  } catch {}
}

async function readNotif(id) { try { await api.readNotification(id); loadNotifs(); } catch {} }
async function markAllRead() { try { await api.readAllNotifications(); loadNotifs(); toast('已全部已读', 'success'); } catch (e) { toast(e.message, 'error'); } }

// ═══ 设置 ═══
function renderSettings() {
  document.getElementById('main-content').innerHTML = `
    ${pageHeader('设置')}
    <div class="page-body">
      <div class="card">
        <div class="font-bold mb-4">个人资料</div>
        <div class="flex items-center gap-4 mb-4">
          ${avatarHtml(S.user, 'xl')}
          <div><input type="file" id="avatar-input" accept="image/*" style="display:none" onchange="uploadAvatar(this)"><button class="btn btn-ghost btn-sm" onclick="document.getElementById('avatar-input').click()">${I.image} 更换头像</button></div>
        </div>
        <div class="form-group"><label class="form-label">昵称</label><input class="form-input" id="s-nick" value="${esc(S.user.nickname)}"></div>
        <div class="form-group"><label class="form-label">个性签名</label><textarea class="form-textarea" id="s-bio" style="min-height:70px">${esc(S.user.bio || '')}</textarea></div>
        <button class="btn btn-primary" onclick="saveProfile()">${I.check} 保存</button>
      </div>
      <div class="card">
        <div class="font-bold mb-4">修改密码</div>
        <div class="form-group"><label class="form-label">旧密码</label><input class="form-input" id="s-old-p" type="password"></div>
        <div class="form-group"><label class="form-label">新密码</label><input class="form-input" id="s-new-p" type="password" placeholder="至少6位"></div>
        <button class="btn btn-primary" onclick="savePassword()">修改密码</button>
      </div>
      <div class="card"><div class="font-bold mb-4">${I.shield} 黑名单管理</div><div id="bl-content"><div class="spinner"></div></div></div>
      <div class="card">
        <div class="font-bold mb-4">账号操作</div>
        <div class="flex flex-col gap-2">
          <button class="btn btn-ghost btn-block" onclick="doLogout()">${I.logout} 退出登录</button>
          <button class="btn btn-danger btn-block" onclick="showDeleteAccount()">${I.trash} 注销账号</button>
        </div>
      </div>
      <div class="text-center text-xs text-muted mt-6 mb-4">SEEDCHAT v2.0 · 丐帮 | beggarhub 我的世界工作室</div>
    </div>`;
  loadBlacklist();
}

async function uploadAvatar(input) {
  const f = input.files[0]; if (!f) return;
  try {
    toast('头像上传中...'); const url = await uploadImg(f);
    S.user = (await api.updateProfile({ avatar: url })).user;
    renderApp(); navigate('settings'); toast('头像已更新', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

async function saveProfile() {
  try {
    S.user = (await api.updateProfile({ nickname: document.getElementById('s-nick').value.trim(), bio: document.getElementById('s-bio').value.trim() })).user;
    renderApp(); navigate('settings'); toast('已保存', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

async function savePassword() {
  const o = document.getElementById('s-old-p').value, n = document.getElementById('s-new-p').value;
  if (!o || !n) { toast('请填写完整', 'error'); return; }
  try {
    S.token = (await api.changePassword({ oldPassword: o, newPassword: n })).token;
    localStorage.setItem('token', S.token); toast('密码已修改，请重新登录', 'success'); setTimeout(doLogout, 1500);
  } catch (e) { toast(e.message, 'error'); }
}

function showDeleteAccount() {
  showModal(`<div class="modal-header"><div class="modal-title text-danger">${I.alert} 注销账号</div><button class="modal-close" onclick="closeModal()">${I.close}</button></div>
    <p class="text-danger mb-4">警告：注销后所有数据将被永久删除，包括帖子、消息、好友等，且不可恢复！</p>
    <div class="form-group"><label class="form-label">输入密码确认</label><input class="form-input" id="del-p" type="password" placeholder="输入密码"></div>
    <button class="btn btn-danger btn-block" onclick="confirmDeleteAccount()">确认注销</button>`);
}

async function confirmDeleteAccount() {
  const p = document.getElementById('del-p').value; if (!p) { toast('请输入密码', 'error'); return; }
  try {
    await api.deleteAccount({ password: p });
    S.token = null; S.user = null; localStorage.removeItem('token'); if (S.ws) S.ws.close();
    closeModal(); renderAuth(); toast('账号已注销', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

async function loadBlacklist() {
  try {
    const d = await api.getBlacklist();
    const c = document.getElementById('bl-content'); if (!c) return;
    if (!d.blacklist.length) { c.innerHTML = '<div class="text-sm text-muted">黑名单为空</div>'; return; }
    c.innerHTML = d.blacklist.map(b => `
      <div class="list-item" style="padding:8px">
        ${avatarHtml(b, 'sm')}<div class="list-item-info"><div class="list-item-name">${esc(b.nickname)}</div></div>
        <button class="btn btn-ghost btn-sm" onclick="unblockUser(${b.user_id})">解除</button>
      </div>`).join('');
  } catch {}
}

async function addBlacklist(uid) {
  if (!confirm('确定拉黑该用户？将自动删除好友关系。')) return;
  try { await api.addToBlacklist(uid); toast('已拉黑', 'success'); loadBlacklist(); } catch (e) { toast(e.message, 'error'); }
}

async function unblockUser(uid) {
  try { await api.removeFromBlacklist(uid); toast('已解除', 'success'); loadBlacklist(); } catch (e) { toast(e.message, 'error'); }
}

// ═══ 辅助 ═══
function emptyState(icon, text) {
  return `<div class="empty-state">${icon}<div class="empty-state-text">${text}</div></div>`;
}

// ═══ 启动 ═══
init();
