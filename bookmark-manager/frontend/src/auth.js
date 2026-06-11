import { create } from 'zustand';
import { api, getToken, setToken } from './api.js';

export const useAuth = create((set, get) => ({
  ready: false,
  status: null,         // { auth_enabled, needs_setup }
  user: null,

  async init() {
    try {
      const status = await api.get('/auth/status');
      set({ status });
      if (!status.auth_enabled) {
        // No-auth mode; backend will use default user. Mark ready immediately.
        try { const me = await api.get('/auth/me'); set({ user: me.user }); } catch {}
        set({ ready: true });
        return;
      }
      if (status.needs_setup) { set({ ready: true }); return; }
      const token = getToken();
      if (!token) { set({ ready: true }); return; }
      try {
        const me = await api.get('/auth/me');
        set({ user: me.user, ready: true });
      } catch {
        setToken(''); set({ ready: true });
      }
    } catch (e) {
      // Backend unreachable; still let UI render so we can show a useful error.
      set({ ready: true });
    }
  },

  async signup(payload) {
    const r = await api.post('/auth/signup', payload);
    setToken(r.token);
    set({ user: r.user, status: { ...(get().status || {}), needs_setup: false, auth_enabled: true } });
    return r;
  },

  async login(payload) {
    const r = await api.post('/auth/login', payload);
    setToken(r.token);
    set({ user: r.user });
    return r;
  },

  logout() {
    setToken('');
    set({ user: null });
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('bm:unauthorized', () => useAuth.getState().logout());
}
