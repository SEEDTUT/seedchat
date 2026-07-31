// ========== SEEDCHAT 应用 ==========
// 丐帮|beggarhub 官方论坛

// ===== 全局状态 =====
const state = {
  user: null,
  token: localStorage.getItem('token') || null,
  currentView: 'forum',
  currentPostId: null,
  currentChatPeer: null,
  currentGroupId: null,
  chatMode: 'private', // private / group
  friends: [],
  notifications: [],
  ws: null,
  wsReconnectTimer: null,
  messages: {}, // { peerId: [messages] }
  groupMessages: {}, // { groupId: [messages] }
  sidebarOpen: false,
};

// ===== API 客户端 =====
const api = {
  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
    const res = await fetch(`/api${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || '请求失败');
    return data;
  },

  // 认证
  register: (d) => api.request('/auth/register', { method: 'POST', body: JSON.stringify(d) }),
  login: (d) => api.request('/auth/login', { method: 'POST', body: JSON.stringify(d) }),
  logout: () => api.request('/auth/logout', { method: 'POST' }),
  getMe: () => api.request('/auth/me'),

  // 用户
  searchUsers: (q) => api.request(`/users/search?q=${encodeURIComponent(q)}`),
  getUser: (id) => api.request(`/users/${id}`),

  // 帖子
  getPosts: (page = 1, authorId) => api.request(`/posts?page=${page}${authorId ? `&author_id=${authorId}` : ''}`),
  getPost: (id) => api.request(`/posts/${id}`),
  createPost: (d) => api.request('/posts', { method: 'POST', body: JSON.stringify(d) }),
  editPost: (id, d) => api.request(`/posts/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deletePost: (id) => api.request(`/posts/${id}`, { method: 'DELETE' }),
  likePost: (id) => api.request(`/posts/${id}/like`, { method: 'POST' }),
  unlikePost: (id) => api.request(`/posts/${id}/like`, { method: 'DELETE' }),
  pinPost: (id) => api.request(`/posts/${id}/pin`, { method: 'POST' }),
  getComments: (id) => api.request(`/posts/${id}/comments`),
  createComment: (id, d) => api.request(`/posts/${id}/comments`, { method: 'POST', body: JSON.stringify(d) }),
  deleteComment: (id) => api.request(`/comments/${id}`, { method: 'DELETE' }),

  // 好友
  getFriends: () => api.request('/friends'),
  getFriendRequests: () => api.request('/friends/requests'),
  sendFriendRequest: (toUserId) => api.request('/friends/request', { method: 'POST', body: JSON.stringify({ toUserId }) }),
  acceptFriendRequest: (requestId) => api.request('/friends/accept', { method: 'POST', body: JSON.stringify({ requestId }) }),
  rejectFriendRequest: (requestId) => api.request('/friends/reject', { method: 'POST', body: JSON.stringify({ requestId }) }),
  removeFriend: (id) => api.request(`/friends/${id}`, { method: 'DELETE' }),

  // 私信
  getConversations: () => api.request('/messages/conversations'),
  getMessages: (peerId, before) => api.request(`/messages/${peerId}${before ? `?before=${before}` : ''}`),
  sendMessage: (d) => api.request('/messages', { method: 'POST', body: JSON.stringify(d) }),
  recallMessage: (id) => api.request(`/messages/${id}/recall`, { method: 'POST' }),

  // 群聊
  getGroups: () => api.request('/groups'),
  createGroup: (d) => api.request('/groups', { method: 'POST', body: JSON.stringify(d) }),
  getGroup: (id) => api.request(`/groups/${id}`),
  getGroupMessages: (id, before) => api.request(`/groups/${id}/messages${before ? `?before=${before}` : ''}`),
  sendGroupMessage: (id, d) => api.request(`/groups/${id}/messages`, { method: 'POST', body: JSON.stringify(d) }),
  recallGroupMessage: (gid, mid) => api.request(`/groups/${gid}/messages/${mid}/recall`, { method: 'POST' }),
  addGroupMember: (gid, userId) => api.request(`/groups/${gid}/members`, { method: 'POST', body: JSON.stringify({ userId }) }),
  removeGroupMember: (gid, userId) => api.request(`/groups/${gid}/members/${userId}`, { method: 'DELETE' }),
  leaveGroup: (gid) => api.request(`/groups/${gid}/leave`, { method: 'POST' }),
  deleteGroup: (gid) => api.request(`/groups/${gid}`, { method: 'DELETE' }),

  // 黑名单
  getBlacklist: () => api.request('/blacklist'),
  addToBlacklist: (userId) => api.request('/blacklist', { method: 'POST', body: JSON.stringify({ userId }) }),
  removeFromBlacklist: (userId) => api.request(`/blacklist/${userId}`, { method: 'DELETE' }),

  // 图片
  uploadImage: (image) => api.request('/images/upload', { method: 'POST', body: JSON.stringify({ image }) }),

  // 设置
  updateProfile: (d) => api.request('/settings/profile', { method: 'PUT', body: JSON.stringify(d) }),
  changePassword: (d) => api.request('/settings/password', { method: 'PUT', body: JSON.stringify(d) }),
  deleteAccount: (d) => api.request('/settings/account', { method: 'DELETE', body: JSON.stringify(d) }),

  // 通知
  getNotifications: () => api.request('/notifications'),
  readNotification: (id) => api.request(`/notifications/${id}/read`, { method: 'PUT' }),
  readAllNotifications: () => api.request('/notifications/read-all', { method: 'PUT' }),
};

// ===== WebSocket 管理 =====
function connectWebSocket() {
  if (!state.token) return;
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  state.ws = new WebSocket(`${protocol}//${location.host}/api/ws?token=${state.token}`);

  state.ws.onopen = () => {
    console.log('WebSocket connected');
    // 心跳
    setInterval(() => {
      if (state.ws?.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  };

  state.ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleWsMessage(data);
  };

  state.ws.onclose = () => {
    console.log('WebSocket disconnected');
    if (state.token) {
      state.wsReconnectTimer = setTimeout(connectWebSocket, 3000);
    }
  };

  state.ws.onerror = (e) => console.error('WS error', e);
}

function wsSend(data) {
  if (state.ws?.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify(data));
  }
}

function handleWsMessage(data) {
  switch (data.type) {
    case 'private_message':
      handleIncomingPrivateMessage(data);
      break;
    case 'group_message':
      handleIncomingGroupMessage(data);
      break;
    case 'recall_message':
      handleRecallPrivate(data);
      break;
    case 'recall_group_message':
      handleRecallGroup(data);
      break;
    case 'new_post':
      handleNewPost(data);
      break;
    case 'user_status':
      handleUserStatus(data);
      break;
    case 'friend_request':
    case 'friend_accept':
      showToast(data.type === 'friend_request' ? '收到新的好友请求' : '好友请求已通过');
      loadNotifications();
      break;
    case 'typing':
      showTypingIndicator(data);
      break;
    case 'messages_read':
      // 更新已读状态
      break;
    case 'pong':
      break;
  }
}

// ===== 图片压缩 =====
async function compressImage(file, maxWidth = 1280, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const isPng = file.type === 'image/png';
        canvas.toBlob((blob) => {
          const fr = new FileReader();
          fr.onload = () => {
            const base64 = fr.result.split(',')[1];
            resolve(base64);
          };
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        }, isPng ? 'image/png' : 'image/jpeg', quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadImageFile(file) {
  const base64 = await compressImage(file);
  const result = await api.uploadImage(base64);
  return result.url;
}

// ===== 工具函数 =====
function getAvatarHtml(user, size = '') {
  const cls = size ? `avatar avatar-${size}` : 'avatar';
  if (user?.avatar) {
    return `<img src="${user.avatar}" class="${cls}" style="border-radius:50%">`;
  }
  const name = user?.nickname || user?.username || '?';
  return `<div class="${cls}">${name.charAt(0).toUpperCase()}</div>`;
}

function formatTime(ts) {
  const now = Date.now() / 1000;
  const diff = now - ts;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
  const d = new Date(ts * 1000);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = '') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.getElementById('toast-root').appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showModal(content) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${content}</div>`;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.getElementById('modal-root').appendChild(overlay);
  return overlay;
}

function closeModal(overlay) {
  if (overlay) overlay.remove();
  else document.querySelector('.modal-overlay')?.remove();
}

function showImagePreview(url) {
  const overlay = document.createElement('div');
  overlay.className = 'image-preview-overlay';
  overlay.innerHTML = `<img src="${url}">`;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

// ===== 认证 =====
async function init() {
  if (state.token) {
    try {
      const data = await api.getMe();
      state.user = data.user;
      renderApp();
      connectWebSocket();
      loadNotifications();
    } catch {
      state.token = null;
      localStorage.removeItem('token');
      renderAuth();
    }
  } else {
    renderAuth();
  }
}

function renderAuth() {
  document.getElementById('app').innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">🌱</div>
        <div class="auth-title">SEEDCHAT</div>
        <div class="auth-subtitle">丐帮|beggarhub 我的世界工作室官方论坛</div>
        <div class="auth-tabs">
          <button class="auth-tab active" id="tab-login" onclick="switchAuthTab('login')">登录</button>
          <button class="auth-tab" id="tab-register" onclick="switchAuthTab('register')">注册</button>
        </div>
        <div id="auth-form"></div>
      </div>
    </div>
  `;
  switchAuthTab('login');
}

function switchAuthTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  const form = document.getElementById('auth-form');
  if (tab === 'login') {
    form.innerHTML = `
      <div class="form-group">
        <label class="form-label">用户名</label>
        <input class="form-input" id="login-username" placeholder="输入用户名" onkeydown="if(event.key==='Enter')doLogin()">
      </div>
      <div class="form-group">
        <label class="form-label">密码</label>
        <input class="form-input" id="login-password" type="password" placeholder="输入密码" onkeydown="if(event.key==='Enter')doLogin()">
      </div>
      <div id="auth-error"></div>
      <button class="btn btn-primary btn-block mt-4" onclick="doLogin()">登录</button>
    `;
  } else {
    form.innerHTML = `
      <div class="form-group">
        <label class="form-label">用户名</label>
        <input class="form-input" id="reg-username" placeholder="3-20个字符">
      </div>
      <div class="form-group">
        <label class="form-label">昵称</label>
        <input class="form-input" id="reg-nickname" placeholder="你的昵称">
      </div>
      <div class="form-group">
        <label class="form-label">密码</label>
        <input class="form-input" id="reg-password" type="password" placeholder="至少6位">
      </div>
      <div id="auth-error"></div>
      <button class="btn btn-primary btn-block mt-4" onclick="doRegister()">注册</button>
    `;
  }
}

async function doLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  if (!username || !password) return;
  try {
    const data = await api.login({ username, password });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('token', state.token);
    renderApp();
    connectWebSocket();
    loadNotifications();
    showToast('登录成功', 'success');
  } catch (e) {
    document.getElementById('auth-error').innerHTML = `<div class="form-error">${e.message}</div>`;
  }
}

async function doRegister() {
  const username = document.getElementById('reg-username').value.trim();
  const nickname = document.getElementById('reg-nickname').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!username || !nickname || !password) return;
  try {
    const data = await api.register({ username, nickname, password });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('token', state.token);
    renderApp();
    connectWebSocket();
    showToast('注册成功，欢迎加入！', 'success');
  } catch (e) {
    document.getElementById('auth-error').innerHTML = `<div class="form-error">${e.message}</div>`;
  }
}

async function doLogout() {
  try { await api.logout(); } catch {}
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  if (state.ws) state.ws.close();
  renderAuth();
}

// ===== 主应用渲染 =====
function renderApp() {
  document.getElementById('app').innerHTML = `
    <div class="layout">
      <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <span class="sidebar-logo">🌱</span>
          <span class="sidebar-title">SEEDCHAT</span>
        </div>
        <nav class="sidebar-nav">
          <div class="nav-item active" data-view="forum" onclick="navigate('forum')">
            <span class="nav-icon">📋</span> 论坛
          </div>
          <div class="nav-item" data-view="messages" onclick="navigate('messages')">
            <span class="nav-icon">💬</span> 私信
          </div>
          <div class="nav-item" data-view="groups" onclick="navigate('groups')">
            <span class="nav-icon">👥</span> 群聊
          </div>
          <div class="nav-item" data-view="friends" onclick="navigate('friends')">
            <span class="nav-icon">🤝</span> 好友
          </div>
          <div class="nav-item" data-view="notifications" onclick="navigate('notifications')">
            <span class="nav-icon">🔔</span> 通知
            <span class="nav-badge hidden" id="notif-badge">0</span>
          </div>
          <div class="nav-item" data-view="settings" onclick="navigate('settings')">
            <span class="nav-icon">⚙️</span> 设置
          </div>
        </nav>
        <div class="sidebar-footer">
          <div class="user-card" onclick="navigate('settings')">
            ${getAvatarHtml(state.user)}
            <div class="user-card-info">
              <div class="user-card-name">${escapeHtml(state.user.nickname)}</div>
              <div class="user-card-status">
                <span class="status-dot online"></span> 在线
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="main-content" id="main-content"></div>
    </div>
  `;
  navigate('forum');
}

function navigate(view) {
  state.currentView = view;
  state.sidebarOpen = false;
  document.getElementById('sidebar')?.classList.remove('open');
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });
  const viewRenderers = {
    forum: renderForum,
    messages: renderMessages,
    groups: renderGroups,
    friends: renderFriends,
    notifications: renderNotifications,
    settings: renderSettings,
  };
  viewRenderers[view]?.();
}

// ===== 论坛 =====
async function renderForum() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost btn-icon mobile-menu-btn" onclick="toggleSidebar()">☰</button>
        <span class="page-title">论坛</span>
      </div>
      <button class="btn btn-primary btn-sm" onclick="showCreatePostModal()">✏️ 发帖</button>
    </div>
    <div class="page-body" id="forum-body">
      <div class="loading-spinner"></div>
    </div>
  `;
  try {
    const data = await api.getPosts();
    renderPostList(data.posts);
  } catch (e) {
    document.getElementById('forum-body').innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">${e.message}</div></div>`;
  }
}

function renderPostList(posts) {
  const body = document.getElementById('forum-body');
  if (!posts.length) {
    body.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-text">还没有帖子，快来发第一帖吧！</div></div>`;
    return;
  }
  body.innerHTML = posts.map(post => `
    <div class="post-card ${post.pinned ? 'pinned' : ''}" onclick="viewPost(${post.id})">
      <div class="post-header">
        ${getAvatarHtml({ nickname: post.nickname, avatar: post.avatar })}
        <div class="post-author">
          <div class="post-author-name">${escapeHtml(post.nickname)}</div>
          <div class="post-author-time">${formatTime(post.created_at)} · ${post.views} 浏览</div>
        </div>
        ${post.pinned ? '<span class="pin-badge">📌 置顶</span>' : ''}
      </div>
      <div class="post-title">${escapeHtml(post.title)}</div>
      <div class="post-content">${escapeHtml(post.content)}</div>
      ${post.images && post.images.length ? `<div class="post-images">${post.images.slice(0, 4).map(img => `<img class="post-image" src="${img}" onclick="event.stopPropagation();showImagePreview('${img}')">`).join('')}</div>` : ''}
      <div class="post-footer">
        <button class="post-action ${post.liked ? 'liked' : ''}" onclick="event.stopPropagation();toggleLike(${post.id}, ${post.liked})">
          ${post.liked ? '❤️' : '🤍'} ${post.like_count}
        </button>
        <button class="post-action" onclick="event.stopPropagation();viewPost(${post.id})">
          💬 ${post.comment_count}
        </button>
        <button class="post-action" onclick="event.stopPropagation();sharePost(${post.id}, '${escapeHtml(post.title)}')">
          🔗 分享
        </button>
      </div>
    </div>
  `).join('');
}

async function viewPost(id) {
  state.currentPostId = id;
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost btn-icon" onclick="renderForum()">←</button>
        <span class="page-title">帖子详情</span>
      </div>
    </div>
    <div class="page-body" id="post-detail-body">
      <div class="loading-spinner"></div>
    </div>
  `;
  try {
    const post = await api.getPost(id);
    const comments = await api.getComments(id);
    renderPostDetail(post, comments.comments);
  } catch (e) {
    document.getElementById('post-detail-body').innerHTML = `<div class="empty-state"><div class="empty-state-text">${e.message}</div></div>`;
  }
}

function renderPostDetail(post, comments) {
  const isOwner = state.user?.id === post.user_id;
  document.getElementById('post-detail-body').innerHTML = `
    <div class="post-card" style="cursor:default">
      <div class="post-header">
        ${getAvatarHtml({ nickname: post.nickname, avatar: post.avatar })}
        <div class="post-author">
          <div class="post-author-name">${escapeHtml(post.nickname)}</div>
          <div class="post-author-time">${formatTime(post.created_at)} · ${post.views} 浏览</div>
        </div>
        ${post.pinned ? '<span class="pin-badge">📌 置顶</span>' : ''}
        <div class="flex gap-2">
          ${isOwner ? `<button class="btn btn-ghost btn-sm" onclick="showEditPostModal(${post.id})">编辑</button>
          <button class="btn btn-ghost btn-sm text-danger" onclick="deletePost(${post.id})">删除</button>` : ''}
        </div>
      </div>
      <div class="post-title" style="font-size:24px">${escapeHtml(post.title)}</div>
      <div class="post-content" style="max-height:none">${escapeHtml(post.content)}</div>
      ${post.images && post.images.length ? `<div class="post-images" style="margin-top:16px">${post.images.map(img => `<img class="post-image" style="width:160px;height:160px" src="${img}" onclick="showImagePreview('${img}')">`).join('')}</div>` : ''}
      <div class="post-footer">
        <button class="post-action ${post.liked ? 'liked' : ''}" onclick="toggleLike(${post.id}, ${post.liked})">
          ${post.liked ? '❤️' : '🤍'} ${post.like_count}
        </button>
        <button class="post-action">💬 ${post.comment_count}</button>
        <button class="post-action" onclick="sharePost(${post.id}, '${escapeHtml(post.title)}')">🔗 分享</button>
      </div>
    </div>
    <div class="card">
      <div class="font-bold mb-4">评论 (${comments.length})</div>
      <div class="flex gap-2 mb-4">
        <input class="form-input" id="comment-input" placeholder="写下你的评论..." onkeydown="if(event.key==='Enter')submitComment(${post.id})">
        <button class="btn btn-primary" onclick="submitComment(${post.id})">发送</button>
      </div>
      <div id="comments-list">
        ${comments.length ? comments.map(c => `
          <div class="comment-item">
            ${getAvatarHtml({ nickname: c.nickname, avatar: c.avatar }, 'sm')}
            <div class="comment-body">
              <div class="comment-author">${escapeHtml(c.nickname)} ${c.user_id === state.user?.id ? `<button class="btn btn-ghost btn-sm text-danger" style="float:right;padding:2px 8px" onclick="deleteComment(${c.id})">删除</button>` : ''}</div>
              <div class="comment-text">${escapeHtml(c.content)}</div>
              <div class="comment-time">${formatTime(c.created_at)}</div>
            </div>
          </div>
        `).join('') : '<div class="empty-state-text text-muted text-center">暂无评论</div>'}
      </div>
    </div>
  `;
}

async function toggleLike(postId, liked) {
  try {
    if (liked) await api.unlikePost(postId);
    else await api.likePost(postId);
    viewPost(postId);
    if (state.currentView === 'forum') renderForum();
  } catch (e) { showToast(e.message, 'error'); }
}

function sharePost(postId, title) {
  const url = `${location.origin}/?post=${postId}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast('链接已复制到剪贴板', 'success');
  }).catch(() => {
    showModal(`
      <div class="modal-header">
        <div class="modal-title">分享帖子</div>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <p class="text-muted text-sm mb-4">复制以下链接分享给好友：</p>
      <input class="form-input" value="${url}" readonly onclick="this.select()">
    `);
  });
}

async function submitComment(postId) {
  const input = document.getElementById('comment-input');
  const content = input.value.trim();
  if (!content) return;
  try {
    await api.createComment(postId, { content });
    viewPost(postId);
  } catch (e) { showToast(e.message, 'error'); }
}

async function deleteComment(id) {
  if (!confirm('确定删除这条评论？')) return;
  try {
    await api.deleteComment(id);
    viewPost(state.currentPostId);
    showToast('评论已删除', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

async function deletePost(id) {
  if (!confirm('确定删除这篇帖子？')) return;
  try {
    await api.deletePost(id);
    renderForum();
    showToast('帖子已删除', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

function showCreatePostModal() {
  const overlay = showModal(`
    <div class="modal-header">
      <div class="modal-title">发帖</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">标题</label>
      <input class="form-input" id="post-title-input" placeholder="帖子标题">
    </div>
    <div class="form-group">
      <label class="form-label">内容</label>
      <textarea class="form-textarea" id="post-content-input" placeholder="写下你想说的..." style="min-height:160px"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">图片（可选，自动压缩）</label>
      <input type="file" id="post-images-input" accept="image/*" multiple style="font-size:14px">
      <div id="post-image-previews" class="post-images" style="margin-top:8px"></div>
    </div>
    <button class="btn btn-primary btn-block mt-4" id="submit-post-btn" onclick="submitPost()">发布</button>
  `);

  document.getElementById('post-images-input').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    const previewContainer = document.getElementById('post-image-previews');
    previewContainer.innerHTML = '<div class="text-sm text-muted">压缩中...</div>';
    state._tempImages = [];
    for (const file of files) {
      try {
        const url = await uploadImageFile(file);
        state._tempImages.push(url);
      } catch (err) { showToast(`图片上传失败: ${err.message}`, 'error'); }
    }
    previewContainer.innerHTML = state._tempImages.map(url =>
      `<img class="post-image" src="${url}" onclick="showImagePreview('${url}')">`
    ).join('');
  });
}

let _tempImages = [];
async function submitPost() {
  const title = document.getElementById('post-title-input').value.trim();
  const content = document.getElementById('post-content-input').value.trim();
  if (!title || !content) { showToast('标题和内容不能为空', 'error'); return; }
  const btn = document.getElementById('submit-post-btn');
  btn.disabled = true;
  btn.textContent = '发布中...';
  try {
    await api.createPost({ title, content, images: state._tempImages || [] });
    closeModal();
    renderForum();
    showToast('发布成功！', 'success');
  } catch (e) {
    showToast(e.message, 'error');
    btn.disabled = false;
    btn.textContent = '发布';
  }
}

async function showEditPostModal(id) {
  const post = await api.getPost(id);
  showModal(`
    <div class="modal-header">
      <div class="modal-title">编辑帖子</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">标题</label>
      <input class="form-input" id="edit-title" value="${escapeHtml(post.title)}">
    </div>
    <div class="form-group">
      <label class="form-label">内容</label>
      <textarea class="form-textarea" id="edit-content" style="min-height:160px">${escapeHtml(post.content)}</textarea>
    </div>
    <button class="btn btn-primary btn-block mt-4" onclick="submitEditPost(${id})">保存</button>
  `);
}

async function submitEditPost(id) {
  const title = document.getElementById('edit-title').value.trim();
  const content = document.getElementById('edit-content').value.trim();
  try {
    await api.editPost(id, { title, content, images: [] });
    closeModal();
    viewPost(id);
    showToast('修改成功', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

// 实时新帖子通知
function handleNewPost(data) {
  if (state.currentView === 'forum') {
    showToast(`新帖子：${data.title}`, 'success');
    // 自动刷新帖子列表
    setTimeout(() => renderForum(), 1000);
  } else {
    showToast(`📚 新帖子：${data.title}`, '');
  }
}

// ===== 私信 =====
async function renderMessages() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost btn-icon mobile-menu-btn" onclick="toggleSidebar()">☰</button>
        <span class="page-title">私信</span>
      </div>
    </div>
    <div class="chat-layout" style="height:calc(100vh - 64px)">
      <div class="chat-sidebar" id="chat-sidebar">
        <div class="chat-search">
          <input class="form-input" id="chat-search-input" placeholder="搜索用户..." oninput="searchForChat(this.value)">
          <div id="chat-search-results"></div>
        </div>
        <div class="chat-list" id="chat-list">
          <div class="loading-spinner"></div>
        </div>
      </div>
      <div class="chat-main" id="chat-main">
        <div class="chat-empty">
          <div class="chat-empty-icon">💬</div>
          <div>选择一个会话开始聊天</div>
        </div>
      </div>
    </div>
  `;
  state.chatMode = 'private';
  loadConversations();
}

async function loadConversations() {
  try {
    const data = await api.getConversations();
    const list = document.getElementById('chat-list');
    if (!data.conversations.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💬</div><div class="empty-state-text">暂无会话<br>搜索用户开始聊天</div></div>';
      return;
    }
    list.innerHTML = data.conversations.map(c => `
      <div class="chat-list-item" onclick="openChat(${c.peer_id})">
        ${getAvatarHtml({ nickname: c.nickname, avatar: c.avatar })}
        <div class="chat-list-item-info">
          <div class="chat-list-item-name">${escapeHtml(c.nickname)}</div>
          <div class="chat-list-item-preview">${c.recalled ? '消息已撤回' : escapeHtml(c.content)}</div>
        </div>
      </div>
    `).join('');
  } catch {}
}

async function searchForChat(q) {
  const results = document.getElementById('chat-search-results');
  if (!q.trim()) { results.innerHTML = ''; return; }
  try {
    const data = await api.searchUsers(q);
    results.innerHTML = data.users.map(u => `
      <div class="chat-list-item" onclick="openChat(${u.id})">
        ${getAvatarHtml(u, 'sm')}
        <div class="chat-list-item-info">
          <div class="chat-list-item-name">${escapeHtml(u.nickname)}</div>
          <div class="chat-list-item-preview">@${escapeHtml(u.username)}</div>
        </div>
      </div>
    `).join('');
  } catch {}
}

async function openChat(peerId) {
  state.currentChatPeer = peerId;
  state.chatMode = 'private';
  document.querySelectorAll('.chat-list-item').forEach(el => el.classList.remove('active'));
  try {
    const data = await api.getMessages(peerId);
    state.messages[peerId] = data.messages;
    renderChatWindow(data.peer, data.messages);
  } catch (e) { showToast(e.message, 'error'); }
}

function renderChatWindow(peer, messages) {
  const main = document.getElementById('chat-main');
  main.innerHTML = `
    <div class="chat-header">
      ${getAvatarHtml(peer)}
      <div>
        <div class="font-bold">${escapeHtml(peer.nickname)}</div>
        <div class="text-sm text-muted">
          <span class="status-dot ${peer.status === 'online' ? 'online' : ''}"></span>
          ${peer.status === 'online' ? '在线' : '离线'}
        </div>
      </div>
      <div class="flex-1"></div>
      <button class="btn btn-ghost btn-icon" onclick="showChatMenu(${peer.id})">⋮</button>
    </div>
    <div class="chat-messages" id="chat-messages">
      ${messages.map(m => renderMessage(m, state.user.id)).join('')}
    </div>
    <div class="chat-input">
      <label class="cursor-pointer">
        <input type="file" accept="image/*" style="display:none" onchange="sendChatImage(this, ${peer.id})">
        <span style="font-size:22px;cursor:pointer">🖼️</span>
      </label>
      <input class="chat-input-field" id="chat-input-field" placeholder="输入消息..." onkeydown="if(event.key==='Enter')sendChatMessage(${peer.id})">
      <button class="btn btn-primary btn-icon" onclick="sendChatMessage(${peer.id})">➤</button>
    </div>
  `;
  scrollChatToBottom();
}

function renderMessage(m, myId) {
  const isMine = m.from_id === myId;
  if (m.recalled) {
    return `<div class="message-bubble recalled">${isMine ? '你' : '对方'}撤回了一条消息</div>`;
  }
  const time = formatTime(m.created_at);
  const content = m.msg_type === 'image'
    ? `<img class="message-img" src="${m.content}" onclick="showImagePreview('${m.content}')">`
    : escapeHtml(m.content);
  return `
    <div class="message-row ${isMine ? 'mine' : ''}">
      <div class="message-bubble ${isMine ? 'mine' : 'theirs'}">
        ${isMine ? `<div class="message-actions"><button class="message-action-btn" onclick="recallMsg(${m.id})">撤回</button></div>` : ''}
        ${content}
      </div>
      <div class="message-time">${time}</div>
    </div>
  `;
}

function scrollChatToBottom() {
  const el = document.getElementById('chat-messages');
  if (el) el.scrollTop = el.scrollHeight;
}

async function sendChatMessage(peerId) {
  const input = document.getElementById('chat-input-field');
  const content = input.value.trim();
  if (!content) return;
  input.value = '';
  try {
    const data = await api.sendMessage({ toId: peerId, content });
    if (!state.messages[peerId]) state.messages[peerId] = [];
    state.messages[peerId].push(data.message);
    appendMessage(data.message, state.user.id);
  } catch (e) { showToast(e.message, 'error'); }
}

async function sendChatImage(input, peerId) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  try {
    showToast('图片压缩上传中...', '');
    const url = await uploadImageFile(file);
    const data = await api.sendMessage({ toId: peerId, content: url, msgType: 'image' });
    if (!state.messages[peerId]) state.messages[peerId] = [];
    state.messages[peerId].push(data.message);
    appendMessage(data.message, state.user.id);
  } catch (e) { showToast(e.message, 'error'); }
}

function appendMessage(m, myId) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  container.insertAdjacentHTML('beforeend', renderMessage(m, myId));
  scrollChatToBottom();
}

async function recallMsg(msgId) {
  try {
    await api.recallMessage(msgId);
    // 更新UI
    if (state.currentChatPeer && state.messages[state.currentChatPeer]) {
      const msg = state.messages[state.currentChatPeer].find(m => m.id === msgId);
      if (msg) { msg.recalled = 1; }
    }
    openChat(state.currentChatPeer);
    showToast('消息已撤回', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

function handleIncomingPrivateMessage(data) {
  if (state.chatMode === 'private' && state.currentChatPeer === data.fromId) {
    const msg = {
      id: data.msgId, from_id: data.fromId, to_id: state.user.id,
      content: data.content, msg_type: data.msgType, recalled: 0,
      created_at: Math.floor(data.timestamp / 1000),
    };
    if (!state.messages[data.fromId]) state.messages[data.fromId] = [];
    state.messages[data.fromId].push(msg);
    appendMessage(msg, state.user.id);
  } else {
    showToast('💬 新消息', '');
    loadConversations();
  }
}

function handleRecallPrivate(data) {
  if (state.chatMode === 'private' && state.currentChatPeer === data.fromId) {
    if (state.messages[data.fromId]) {
      const msg = state.messages[data.fromId].find(m => m.id === data.msgId);
      if (msg) msg.recalled = 1;
    }
    openChat(state.currentChatPeer);
  }
}

function showChatMenu(peerId) {
  showModal(`
    <div class="modal-header">
      <div class="modal-title">聊天选项</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="flex flex-col gap-2">
      <button class="btn btn-secondary btn-block" onclick="closeModal();navigate('friends')">查看资料</button>
      <button class="btn btn-secondary btn-block" onclick="closeModal();addToBlacklist(${peerId})">加入黑名单</button>
    </div>
  `);
}

// ===== 群聊 =====
async function renderGroups() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost btn-icon mobile-menu-btn" onclick="toggleSidebar()">☰</button>
        <span class="page-title">群聊</span>
      </div>
      <button class="btn btn-primary btn-sm" onclick="showCreateGroupModal()">➕ 建群</button>
    </div>
    <div class="chat-layout" style="height:calc(100vh - 64px)">
      <div class="chat-sidebar" id="chat-sidebar">
        <div class="chat-list" id="group-list">
          <div class="loading-spinner"></div>
        </div>
      </div>
      <div class="chat-main" id="chat-main">
        <div class="chat-empty">
          <div class="chat-empty-icon">👥</div>
          <div>选择一个群聊开始聊天</div>
        </div>
      </div>
    </div>
  `;
  state.chatMode = 'group';
  loadGroups();
}

async function loadGroups() {
  try {
    const data = await api.getGroups();
    const list = document.getElementById('group-list');
    if (!data.groups.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">还没有群聊<br>点击建群创建</div></div>';
      return;
    }
    list.innerHTML = data.groups.map(g => `
      <div class="chat-list-item" onclick="openGroup(${g.id})">
        <div class="avatar">${g.name.charAt(0)}</div>
        <div class="chat-list-item-info">
          <div class="chat-list-item-name">${escapeHtml(g.name)}</div>
          <div class="chat-list-item-preview">${g.member_count} 人 · ${g.role === 'owner' ? '群主' : g.role === 'admin' ? '管理员' : '成员'}</div>
        </div>
      </div>
    `).join('');
  } catch {}
}

async function openGroup(groupId) {
  state.currentGroupId = groupId;
  state.chatMode = 'group';
  try {
    const [groupData, msgData] = await Promise.all([
      api.getGroup(groupId),
      api.getGroupMessages(groupId),
    ]);
    state.groupMessages[groupId] = msgData.messages;
    renderGroupChat(groupData, msgData.messages);
  } catch (e) { showToast(e.message, 'error'); }
}

function renderGroupChat(groupData, messages) {
  const group = groupData.group;
  const members = groupData.members;
  const main = document.getElementById('chat-main');
  main.innerHTML = `
    <div class="chat-header">
      <div class="avatar">${group.name.charAt(0)}</div>
      <div>
        <div class="font-bold">${escapeHtml(group.name)}</div>
        <div class="text-sm text-muted">${members.length} 人</div>
      </div>
      <div class="flex-1"></div>
      <button class="btn btn-ghost btn-icon" onclick="showGroupMenu(${group.id}, ${JSON.stringify(members).replace(/"/g, '&quot;')}, '${escapeHtml(group.name)}')">⚙️</button>
    </div>
    <div class="chat-messages" id="chat-messages">
      ${messages.map(m => renderGroupMessage(m, state.user.id)).join('')}
    </div>
    <div class="chat-input">
      <label class="cursor-pointer">
        <input type="file" accept="image/*" style="display:none" onchange="sendGroupImage(this, ${group.id})">
        <span style="font-size:22px;cursor:pointer">🖼️</span>
      </label>
      <input class="chat-input-field" id="chat-input-field" placeholder="输入消息..." onkeydown="if(event.key==='Enter')sendGroupMessage(${group.id})">
      <button class="btn btn-primary btn-icon" onclick="sendGroupMessage(${group.id})">➤</button>
    </div>
  `;
  scrollChatToBottom();
}

function renderGroupMessage(m, myId) {
  const isMine = m.from_id === myId;
  if (m.recalled) {
    return `<div class="message-bubble recalled">${escapeHtml(m.nickname)}撤回了一条消息</div>`;
  }
  const time = formatTime(m.created_at);
  const content = m.msg_type === 'image'
    ? `<img class="message-img" src="${m.content}" onclick="showImagePreview('${m.content}')">`
    : escapeHtml(m.content);
  return `
    <div class="message-row ${isMine ? 'mine' : ''}">
      ${!isMine ? `<div class="message-name">${escapeHtml(m.nickname)}</div>` : ''}
      <div class="message-bubble ${isMine ? 'mine' : 'theirs'}">
        ${isMine ? `<div class="message-actions"><button class="message-action-btn" onclick="recallGroupMsg(${m.group_id}, ${m.id})">撤回</button></div>` : ''}
        ${content}
      </div>
      <div class="message-time">${time}</div>
    </div>
  `;
}

async function sendGroupMessage(groupId) {
  const input = document.getElementById('chat-input-field');
  const content = input.value.trim();
  if (!content) return;
  input.value = '';
  try {
    const data = await api.sendGroupMessage(groupId, { content });
    if (!state.groupMessages[groupId]) state.groupMessages[groupId] = [];
    state.groupMessages[groupId].push(data.message);
    const container = document.getElementById('chat-messages');
    container.insertAdjacentHTML('beforeend', renderGroupMessage(data.message, state.user.id));
    scrollChatToBottom();
  } catch (e) { showToast(e.message, 'error'); }
}

async function sendGroupImage(input, groupId) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  try {
    showToast('图片压缩上传中...', '');
    const url = await uploadImageFile(file);
    const data = await api.sendGroupMessage(groupId, { content: url, msgType: 'image' });
    if (!state.groupMessages[groupId]) state.groupMessages[groupId] = [];
    state.groupMessages[groupId].push(data.message);
    const container = document.getElementById('chat-messages');
    container.insertAdjacentHTML('beforeend', renderGroupMessage(data.message, state.user.id));
    scrollChatToBottom();
  } catch (e) { showToast(e.message, 'error'); }
}

async function recallGroupMsg(groupId, msgId) {
  try {
    await api.recallGroupMessage(groupId, msgId);
    openGroup(groupId);
    showToast('消息已撤回', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

function handleIncomingGroupMessage(data) {
  if (state.chatMode === 'group' && state.currentGroupId === data.groupId) {
    const msg = {
      id: data.msgId, group_id: data.groupId, from_id: data.fromId,
      nickname: data.fromName, avatar: data.fromAvatar,
      content: data.content, msg_type: data.msgType, recalled: 0,
      created_at: Math.floor(data.timestamp / 1000),
    };
    if (!state.groupMessages[data.groupId]) state.groupMessages[data.groupId] = [];
    state.groupMessages[data.groupId].push(msg);
    const container = document.getElementById('chat-messages');
    if (container) {
      container.insertAdjacentHTML('beforeend', renderGroupMessage(msg, state.user.id));
      scrollChatToBottom();
    }
  } else {
    showToast('👥 新群消息', '');
  }
}

function handleRecallGroup(data) {
  if (state.chatMode === 'group' && state.currentGroupId === data.groupId) {
    if (state.groupMessages[data.groupId]) {
      const msg = state.groupMessages[data.groupId].find(m => m.id === data.msgId);
      if (msg) msg.recalled = 1;
    }
    openGroup(state.currentGroupId);
  }
}

function showCreateGroupModal() {
  showModal(`
    <div class="modal-header">
      <div class="modal-title">创建群聊</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">群名称</label>
      <input class="form-input" id="group-name-input" placeholder="群名称">
    </div>
    <div class="form-group">
      <label class="form-label">群描述（可选）</label>
      <input class="form-input" id="group-desc-input" placeholder="群描述">
    </div>
    <div class="form-group">
      <label class="form-label">添加成员</label>
      <input class="form-input" id="group-search-input" placeholder="搜索好友..." oninput="searchFriendsForGroup(this.value)">
      <div id="group-search-results" style="margin-top:8px"></div>
      <div id="group-selected-members" style="margin-top:8px"></div>
    </div>
    <button class="btn btn-primary btn-block mt-4" onclick="submitCreateGroup()">创建</button>
  `);
  state._selectedMembers = [];
  // 加载好友列表
  searchFriendsForGroup('');
}

async function searchFriendsForGroup(q) {
  try {
    const data = await api.getFriends();
    const friends = q ? data.friends.filter(f => f.nickname.includes(q) || f.username.includes(q)) : data.friends;
    const results = document.getElementById('group-search-results');
    results.innerHTML = friends.map(f => `
      <div class="list-item" style="padding:8px" onclick="toggleGroupMember(${f.id}, '${escapeHtml(f.nickname)}')">
        ${getAvatarHtml(f, 'sm')}
        <div class="list-item-info"><div class="list-item-name">${escapeHtml(f.nickname)}</div></div>
        <button class="btn btn-ghost btn-sm">添加</button>
      </div>
    `).join('');
  } catch {}
}

function toggleGroupMember(userId, name) {
  if (!state._selectedMembers) state._selectedMembers = [];
  const idx = state._selectedMembers.findIndex(m => m.id === userId);
  if (idx >= 0) state._selectedMembers.splice(idx, 1);
  else state._selectedMembers.push({ id: userId, name });
  document.getElementById('group-selected-members').innerHTML = state._selectedMembers.map(m =>
    `<span class="pin-badge" style="cursor:pointer" onclick="toggleGroupMember(${m.id}, '${m.name}')">${m.name} ✕</span> `
  ).join('');
}

async function submitCreateGroup() {
  const name = document.getElementById('group-name-input').value.trim();
  const description = document.getElementById('group-desc-input').value.trim();
  if (!name) { showToast('群名不能为空', 'error'); return; }
  try {
    await api.createGroup({ name, description, memberIds: state._selectedMembers.map(m => m.id) });
    closeModal();
    renderGroups();
    showToast('群聊创建成功', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

function showGroupMenu(groupId, membersJson, groupName) {
  const members = JSON.parse(membersJson.replace(/&quot;/g, '"'));
  const myRole = members.find(m => m.id === state.user.id)?.role;
  const isOwner = myRole === 'owner';
  showModal(`
    <div class="modal-header">
      <div class="modal-title">${escapeHtml(groupName)}</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="mb-4">
      <div class="font-bold mb-2">群成员 (${members.length})</div>
      ${members.map(m => `
        <div class="list-item" style="padding:8px">
          ${getAvatarHtml(m, 'sm')}
          <div class="list-item-info">
            <div class="list-item-name">${escapeHtml(m.nickname)}</div>
            <div class="text-sm text-muted">${m.role === 'owner' ? '群主' : m.role === 'admin' ? '管理员' : '成员'}</div>
          </div>
          ${isOwner && m.id !== state.user.id ? `<button class="btn btn-ghost btn-sm text-danger" onclick="removeGroupMember(${groupId}, ${m.id})">移除</button>` : ''}
        </div>
      `).join('')}
    </div>
    <div class="flex flex-col gap-2">
      ${isOwner ? `<button class="btn btn-danger btn-block" onclick="confirmDeleteGroup(${groupId})">解散群聊</button>` : ''}
      ${!isOwner ? `<button class="btn btn-danger btn-block" onclick="confirmLeaveGroup(${groupId})">退出群聊</button>` : ''}
    </div>
  `);
}

async function removeGroupMember(groupId, userId) {
  try {
    await api.removeGroupMember(groupId, userId);
    closeModal();
    openGroup(groupId);
    showToast('已移除成员', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

async function confirmLeaveGroup(groupId) {
  if (!confirm('确定退出群聊？')) return;
  try {
    await api.leaveGroup(groupId);
    closeModal();
    renderGroups();
    showToast('已退出群聊', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

async function confirmDeleteGroup(groupId) {
  if (!confirm('确定解散群聊？此操作不可恢复。')) return;
  try {
    await api.deleteGroup(groupId);
    closeModal();
    renderGroups();
    showToast('群聊已解散', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

// ===== 好友 =====
async function renderFriends() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost btn-icon mobile-menu-btn" onclick="toggleSidebar()">☰</button>
        <span class="page-title">好友</span>
      </div>
    </div>
    <div class="page-body">
      <div class="flex gap-2 mb-4">
        <input class="form-input" id="friend-search" placeholder="搜索用户添加好友..." oninput="searchUsersToAdd(this.value)">
      </div>
      <div id="friend-search-results"></div>
      <div class="flex gap-2 mb-4 mt-6">
        <button class="btn btn-primary btn-sm" onclick="loadFriendList()">好友列表</button>
        <button class="btn btn-secondary btn-sm" onclick="loadFriendRequests()">好友请求</button>
      </div>
      <div id="friends-content">
        <div class="loading-spinner"></div>
      </div>
    </div>
  `;
  loadFriendList();
}

async function loadFriendList() {
  try {
    const data = await api.getFriends();
    const content = document.getElementById('friends-content');
    if (!data.friends.length) {
      content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🤝</div><div class="empty-state-text">还没有好友<br>搜索用户名添加</div></div>';
      return;
    }
    content.innerHTML = data.friends.map(f => `
      <div class="card flex items-center gap-3">
        ${getAvatarHtml(f)}
        <div class="flex-1">
          <div class="font-bold">${escapeHtml(f.nickname)}</div>
          <div class="text-sm text-muted">@${escapeHtml(f.username)} · <span class="status-dot ${f.status === 'online' ? 'online' : ''}"></span> ${f.status === 'online' ? '在线' : '离线'}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="navigate('messages');setTimeout(()=>openChat(${f.id}),300)">💬 私信</button>
        <button class="btn btn-ghost btn-sm text-danger" onclick="removeFriendConfirm(${f.id})">删除</button>
      </div>
    `).join('');
  } catch (e) { showToast(e.message, 'error'); }
}

async function loadFriendRequests() {
  try {
    const data = await api.getFriendRequests();
    const content = document.getElementById('friends-content');
    if (!data.requests.length) {
      content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">暂无好友请求</div></div>';
      return;
    }
    content.innerHTML = data.requests.map(r => `
      <div class="card flex items-center gap-3">
        ${getAvatarHtml(r)}
        <div class="flex-1">
          <div class="font-bold">${escapeHtml(r.nickname)}</div>
          <div class="text-sm text-muted">@${escapeHtml(r.username)} · ${formatTime(r.created_at)}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="acceptFriend(${r.id})">接受</button>
        <button class="btn btn-ghost btn-sm" onclick="rejectFriend(${r.id})">拒绝</button>
      </div>
    `).join('');
  } catch (e) { showToast(e.message, 'error'); }
}

async function searchUsersToAdd(q) {
  const results = document.getElementById('friend-search-results');
  if (!q.trim()) { results.innerHTML = ''; return; }
  try {
    const data = await api.searchUsers(q);
    results.innerHTML = data.users.map(u => `
      <div class="card flex items-center gap-3" style="padding:12px">
        ${getAvatarHtml(u)}
        <div class="flex-1">
          <div class="font-bold">${escapeHtml(u.nickname)}</div>
          <div class="text-sm text-muted">@${escapeHtml(u.username)}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="sendFriendReq(${u.id})">添加好友</button>
      </div>
    `).join('');
  } catch {}
}

async function sendFriendReq(userId) {
  try {
    await api.sendFriendRequest(userId);
    showToast('好友请求已发送', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

async function acceptFriend(requestId) {
  try {
    await api.acceptFriendRequest(requestId);
    loadFriendRequests();
    showToast('已添加好友', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

async function rejectFriend(requestId) {
  try {
    await api.rejectFriendRequest(requestId);
    loadFriendRequests();
  } catch (e) { showToast(e.message, 'error'); }
}

async function removeFriendConfirm(friendId) {
  if (!confirm('确定删除这个好友？')) return;
  try {
    await api.removeFriend(friendId);
    loadFriendList();
    showToast('已删除好友', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

// ===== 通知 =====
async function renderNotifications() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost btn-icon mobile-menu-btn" onclick="toggleSidebar()">☰</button>
        <span class="page-title">通知</span>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="markAllRead()">全部已读</button>
    </div>
    <div class="page-body" id="notif-body">
      <div class="loading-spinner"></div>
    </div>
  `;
  loadNotifications();
}

async function loadNotifications() {
  try {
    const data = await api.getNotifications();
    // 更新徽章
    const badge = document.getElementById('notif-badge');
    if (badge) {
      if (data.unread > 0) {
        badge.textContent = data.unread;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
    const body = document.getElementById('notif-body');
    if (body && state.currentView === 'notifications') {
      if (!data.notifications.length) {
        body.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔔</div><div class="empty-state-text">暂无通知</div></div>';
        return;
      }
      const iconMap = { friend_request: '🤝', friend_accept: '✅', comment: '💬', like: '❤️', group_invite: '👥' };
      body.innerHTML = data.notifications.map(n => `
        <div class="card ${n.read ? '' : 'cursor-pointer'}" style="${n.read ? 'opacity:0.6' : 'border-left:4px solid var(--primary)'}" ${n.read ? '' : `onclick="readNotif(${n.id})"`}>
          <div class="flex items-center gap-3">
            <span style="font-size:24px">${iconMap[n.type] || '🔔'}</span>
            <div class="flex-1">
              <div>${escapeHtml(n.content)}</div>
              <div class="text-sm text-muted">${formatTime(n.created_at)}</div>
            </div>
            ${!n.read ? '<span class="pin-badge" style="background:var(--primary);color:white">新</span>' : ''}
          </div>
        </div>
      `).join('');
    }
  } catch {}
}

async function readNotif(id) {
  try {
    await api.readNotification(id);
    loadNotifications();
  } catch {}
}

async function markAllRead() {
  try {
    await api.readAllNotifications();
    loadNotifications();
    showToast('已全部标记为已读', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

// ===== 设置 =====
function renderSettings() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost btn-icon mobile-menu-btn" onclick="toggleSidebar()">☰</button>
        <span class="page-title">设置</span>
      </div>
    </div>
    <div class="page-body">
      <div class="card">
        <div class="font-bold mb-4">个人资料</div>
        <div class="flex items-center gap-4 mb-4">
          ${getAvatarHtml(state.user, 'xl')}
          <div>
            <input type="file" id="avatar-input" accept="image/*" style="display:none" onchange="uploadAvatar(this)">
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('avatar-input').click()">更换头像</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">昵称</label>
          <input class="form-input" id="settings-nickname" value="${escapeHtml(state.user.nickname)}">
        </div>
        <div class="form-group">
          <label class="form-label">个性签名</label>
          <textarea class="form-textarea" id="settings-bio" style="min-height:80px">${escapeHtml(state.user.bio || '')}</textarea>
        </div>
        <button class="btn btn-primary" onclick="saveProfile()">保存</button>
      </div>

      <div class="card">
        <div class="font-bold mb-4">修改密码</div>
        <div class="form-group">
          <label class="form-label">旧密码</label>
          <input class="form-input" id="old-password" type="password">
        </div>
        <div class="form-group">
          <label class="form-label">新密码</label>
          <input class="form-input" id="new-password" type="password" placeholder="至少6位">
        </div>
        <button class="btn btn-primary" onclick="savePassword()">修改密码</button>
      </div>

      <div class="card">
        <div class="font-bold mb-4">黑名单管理</div>
        <div id="blacklist-content"><div class="loading-spinner"></div></div>
      </div>

      <div class="card">
        <div class="font-bold mb-4">账号操作</div>
        <div class="flex flex-col gap-2">
          <button class="btn btn-secondary btn-block" onclick="doLogout()">退出登录</button>
          <button class="btn btn-danger btn-block" onclick="showDeleteAccountModal()">注销账号</button>
        </div>
      </div>

      <div class="text-center text-sm text-muted mt-6">
        SEEDCHAT v1.0 · 丐帮|beggarhub 我的世界工作室官方论坛
      </div>
    </div>
  `;
  loadBlacklist();
}

async function uploadAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  try {
    showToast('头像上传中...', '');
    const url = await uploadImageFile(file);
    const data = await api.updateProfile({ avatar: url });
    state.user = data.user;
    renderSettings();
    // 更新侧边栏
    renderApp();
    navigate('settings');
    showToast('头像已更新', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

async function saveProfile() {
  const nickname = document.getElementById('settings-nickname').value.trim();
  const bio = document.getElementById('settings-bio').value.trim();
  try {
    const data = await api.updateProfile({ nickname, bio });
    state.user = data.user;
    renderApp();
    navigate('settings');
    showToast('资料已保存', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

async function savePassword() {
  const oldPassword = document.getElementById('old-password').value;
  const newPassword = document.getElementById('new-password').value;
  if (!oldPassword || !newPassword) { showToast('请填写完整', 'error'); return; }
  try {
    const data = await api.changePassword({ oldPassword, newPassword });
    state.token = data.token;
    localStorage.setItem('token', state.token);
    showToast('密码已修改，请重新登录', 'success');
    setTimeout(doLogout, 1500);
  } catch (e) { showToast(e.message, 'error'); }
}

function showDeleteAccountModal() {
  showModal(`
    <div class="modal-header">
      <div class="modal-title text-danger">注销账号</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <p class="text-danger mb-4">⚠️ 注销后所有数据将被永久删除，包括帖子、消息、好友等，且不可恢复！</p>
    <div class="form-group">
      <label class="form-label">输入密码确认</label>
      <input class="form-input" id="delete-password" type="password" placeholder="输入密码">
    </div>
    <button class="btn btn-danger btn-block" onclick="confirmDeleteAccount()">确认注销</button>
  `);
}

async function confirmDeleteAccount() {
  const password = document.getElementById('delete-password').value;
  if (!password) { showToast('请输入密码', 'error'); return; }
  try {
    await api.deleteAccount({ password });
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    if (state.ws) state.ws.close();
    closeModal();
    renderAuth();
    showToast('账号已注销', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

// ===== 黑名单 =====
async function loadBlacklist() {
  try {
    const data = await api.getBlacklist();
    const content = document.getElementById('blacklist-content');
    if (!content) return;
    if (!data.blacklist.length) {
      content.innerHTML = '<div class="text-sm text-muted">黑名单为空</div>';
      return;
    }
    content.innerHTML = data.blacklist.map(b => `
      <div class="list-item" style="padding:8px">
        ${getAvatarHtml(b, 'sm')}
        <div class="list-item-info"><div class="list-item-name">${escapeHtml(b.nickname)}</div></div>
        <button class="btn btn-ghost btn-sm" onclick="unblockUser(${b.user_id})">解除</button>
      </div>
    `).join('');
  } catch {}
}

async function addToBlacklist(userId) {
  if (!confirm('确定拉黑该用户？拉黑后将自动删除好友关系。')) return;
  try {
    await api.addToBlacklist(userId);
    showToast('已加入黑名单', 'success');
    loadBlacklist();
  } catch (e) { showToast(e.message, 'error'); }
}

async function unblockUser(userId) {
  try {
    await api.removeFromBlacklist(userId);
    showToast('已解除拉黑', 'success');
    loadBlacklist();
  } catch (e) { showToast(e.message, 'error'); }
}

// ===== 用户状态 =====
function handleUserStatus(data) {
  // 更新好友列表中的在线状态
  if (state.currentView === 'friends') loadFriendList();
  if (state.currentView === 'messages') {
    // 更新聊天窗口中的状态
  }
}

function showTypingIndicator(data) {
  // 简单实现：可在聊天输入框上方显示
}

// ===== 侧边栏 =====
function toggleSidebar() {
  state.sidebarOpen = !state.sidebarOpen;
  document.getElementById('sidebar')?.classList.toggle('open', state.sidebarOpen);
}

// ===== 启动 =====
init();
