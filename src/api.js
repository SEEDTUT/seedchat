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

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '请求失败');
  }

  // 处理无内容响应
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

// Auth
export const authApi = {
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/api/auth/me'),
};

// Posts
export const postsApi = {
  list: () => request('/api/posts'),
  create: (body) => request('/api/posts', { method: 'POST', body: JSON.stringify(body) }),
  remove: (id) => request(`/api/posts/${id}`, { method: 'DELETE' }),
};

// Friends
export const friendsApi = {
  list: () => request('/api/friends'),
  users: () => request('/api/friends/users'),
  add: (userId) => request(`/api/friends/${userId}`, { method: 'POST' }),
  remove: (userId) => request(`/api/friends/${userId}`, { method: 'DELETE' }),
};

// Messages
export const messagesApi = {
  conversations: () => request('/api/messages'),
  list: (userId) => request(`/api/messages/${userId}`),
  send: (userId, body) => request(`/api/messages/${userId}`, { method: 'POST', body: JSON.stringify(body) }),
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
  createAnnouncement: (body) => request('/api/admin/announcements', { method: 'POST', body: JSON.stringify(body) }),
  togglePin: (id, body) => request(`/api/admin/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  removeAnnouncement: (id) => request(`/api/admin/announcements/${id}`, { method: 'DELETE' }),
};
