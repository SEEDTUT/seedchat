const API_BASE = '';

// 优先使用管理员会话 token（sessionStorage，不持久化），其次普通 token（localStorage）
function getAuthHeader() {
  const adminToken = sessionStorage.getItem('seedchat_admin_token');
  if (adminToken) return { Authorization: `Bearer ${adminToken}` };
  const token = localStorage.getItem('seedchat_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers,
    },
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && (data.error || data.message)) ||
      '请求失败';
    const err = new Error(message);
    err.status = res.status;
    if (data && typeof data === 'object') {
      err.code = data.code;
      err.data = data;
    }
    throw err;
  }

  return data;
}

// Auth
export const authApi = {
  register: (body) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  adminLogin: (password1, password2) =>
    request('/api/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ password1, password2 }),
    }),
  me: () => request('/api/auth/me'),
  updatePassword: (body) =>
    request('/api/auth/update-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateNickname: (body) =>
    request('/api/auth/update-nickname', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateAvatar: (body) =>
    request('/api/auth/update-avatar', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// Upload (ImgBB 图片上传代理)
export const uploadApi = {
  image: (base64Image) =>
    request('/api/upload/image', {
      method: 'POST',
      body: JSON.stringify({ image: base64Image }),
    }),
};

// Posts
export const postsApi = {
  list: () => request('/api/posts'),
  getDetail: (id) => request(`/api/posts/${id}`),
  create: (body) =>
    request('/api/posts', { method: 'POST', body: JSON.stringify(body) }),
  remove: (id) => request(`/api/posts/${id}`, { method: 'DELETE' }),
  like: (id) => request(`/api/posts/${id}/like`, { method: 'POST' }),
  listComments: (id) => request(`/api/posts/${id}/comments`),
  createComment: (id, body) =>
    request(`/api/posts/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  removeComment: (postId, commentId) =>
    request(`/api/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
    }),
};

// Users
export const usersApi = {
  profile: (userId) => request(`/api/users/${userId}`),
  posts: (userId) => request(`/api/users/${userId}/posts`),
};

// Friends
export const friendsApi = {
  list: () => request('/api/friends'),
  users: () => request('/api/friends/users'),
  add: (userId) => request(`/api/friends/${userId}`, { method: 'POST' }),
  remove: (userId) => request(`/api/friends/${userId}`, { method: 'DELETE' }),
  block: (userId) => request(`/api/friends/${userId}/block`, { method: 'POST' }),
  unblock: (userId) =>
    request(`/api/friends/${userId}/block`, { method: 'DELETE' }),
  blocked: () => request('/api/friends/blocked'),
};

// Messages
export const messagesApi = {
  conversations: () => request('/api/messages'),
  list: (userId) => request(`/api/messages/${userId}`),
  send: (userId, body) =>
    request(`/api/messages/${userId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getNew: (userId, after) =>
    request(`/api/messages/${userId}/new?after=${encodeURIComponent(after)}`),
  recall: (messageId) =>
    request(`/api/messages/${messageId}/recall`, { method: 'POST' }),
  delete: (messageId) =>
    request(`/api/messages/${messageId}`, { method: 'DELETE' }),
};

// Notifications
export const notificationsApi = {
  list: () => request('/api/notifications'),
  unreadCount: () => request('/api/notifications/unread-count'),
  markRead: (id) => request(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () =>
    request('/api/notifications/read-all', { method: 'POST' }),
};

// Announcements (public)
export const announcementsApi = {
  list: () => request('/api/announcements'),
};

// Admin
export const adminApi = {
  listPosts: () => request('/api/admin/posts'),
  removePost: (id) => request(`/api/admin/posts/${id}`, { method: 'DELETE' }),
  listUsers: () => request('/api/admin/users'),
  removeUser: (id) => request(`/api/admin/users/${id}`, { method: 'DELETE' }),
  listAnnouncements: () => request('/api/admin/announcements'),
  createAnnouncement: (body) =>
    request('/api/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  togglePin: (id, body) =>
    request(`/api/admin/announcements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  removeAnnouncement: (id) =>
    request(`/api/admin/announcements/${id}`, { method: 'DELETE' }),
};

// Nameplates 铭牌
export const nameplatesApi = {
  // 获取当前用户拥有的铭牌
  my: () => request('/api/nameplates/my'),
  // 激活（佩戴）某个铭牌
  activate: (id) =>
    request(`/api/nameplates/${id}/activate`, { method: 'POST' }),
  // 取消佩戴
  deactivate: () =>
    request('/api/nameplates/deactivate', { method: 'POST' }),
  // [管理员] 给指定用户发放铭牌
  grant: (userId, data) =>
    request(`/api/nameplates/grant`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, ...data }),
    }),
  // [管理员] 获取指定用户拥有的铭牌
  userPlates: (userId) => request(`/api/nameplates/user/${userId}`),
  // [管理员] 删除某个铭牌
  remove: (id) =>
    request(`/api/nameplates/${id}`, { method: 'DELETE' }),
};

// Updates 更新 / Minecraft 组件
export const updatesApi = {
  list: () => request('/api/updates'),
  get: (id) => request(`/api/updates/${id}`),
  create: (data) =>
    request('/api/updates', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/api/updates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  remove: (id) => request(`/api/updates/${id}`, { method: 'DELETE' }),
};
