import { create } from 'zustand';
import { authApi } from './api';

export const useStore = create((set) => ({
  user: null,
  token: localStorage.getItem('seedchat_token') || null,
  loading: false,

  login: (user, token) => {
    localStorage.setItem('seedchat_token', token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('seedchat_token');
    set({ user: null, token: null });
  },

  loadUser: async () => {
    const token = localStorage.getItem('seedchat_token');
    if (!token) {
      set({ user: null, token: null, loading: false });
      return null;
    }
    set({ loading: true });
    try {
      const user = await authApi.me();
      set({ user, token, loading: false });
      return user;
    } catch (err) {
      localStorage.removeItem('seedchat_token');
      set({ user: null, token: null, loading: false });
      return null;
    }
  },
}));
