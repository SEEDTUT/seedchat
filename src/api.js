const API_BASE = '';

function getAuthHeader() {
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

// Posts
export const postsApi = {
  list: () => request('/api/posts'),
  create: (body) =>
    request('/api/posts', { method: 'POST', body: JSON.stringify(body) }),
  remove: (id) => request(`/api/posts/${id}`, { method: 'DELETE' }),
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
