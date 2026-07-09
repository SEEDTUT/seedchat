import { create } from 'zustand';
import { authApi } from './api';
import { shortUid } from './lib/uid';

// 为用户对象附加短数字 uid（用于界面展示）
function withUid(user) {
  if (!user) return user;
  return { ...user, uid: shortUid(user.id) };
}

export const useStore = create((set) => ({
  user: null,
  token:
    localStorage.getItem('seedchat_token') ||
    sessionStorage.getItem('seedchat_admin_token') ||
    null,
  is_admin_mode: !!sessionStorage.getItem('seedchat_admin_token'),
  loading: false,

  // 普通登录：持久化到 localStorage
  login: (user, token) => {
    localStorage.setItem('seedchat_token', token);
    set({ user: withUid(user), token, is_admin_mode: false });
  },

  // 管理员登录：仅存于 sessionStorage，关闭标签页即失效
  loginAdmin: (user, token) => {
    sessionStorage.setItem('seedchat_admin_token', token);
    set({ user: withUid(user), token, is_admin_mode: true });
  },

  logout: () => {
    localStorage.removeItem('seedchat_token');
    sessionStorage.removeItem('seedchat_admin_token');
    set({ user: null, token: null, is_admin_mode: false });
  },

  // 局部更新当前用户信息（nickname、avatar 等）
  updateUser: (patch) => {
    set((state) =>
      state.user ? { user: withUid({ ...state.user, ...patch }) } : state
    );
  },

  loadUser: async () => {
    const adminToken = sessionStorage.getItem('seedchat_admin_token');
    const token = adminToken || localStorage.getItem('seedchat_token');
    if (!token) {
      set({ user: null, token: null, is_admin_mode: false, loading: false });
      return null;
    }
    set({ loading: true, is_admin_mode: !!adminToken });
    try {
      const user = await authApi.me();
      set({ user: withUid(user), token, is_admin_mode: !!adminToken, loading: false });
      return user;
    } catch (err) {
      localStorage.removeItem('seedchat_token');
      sessionStorage.removeItem('seedchat_admin_token');
      set({ user: null, token: null, is_admin_mode: false, loading: false });
      return null;
    }
  },
}));
