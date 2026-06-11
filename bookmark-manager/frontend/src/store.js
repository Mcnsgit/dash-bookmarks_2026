import { create } from 'zustand';

export const useUI = create((set) => ({
  view: 'grid',                 // grid | list
  setView: (v) => set({ view: v }),
  search: '',
  setSearch: (s) => set({ search: s }),
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  dark: typeof window !== 'undefined' && localStorage.getItem('dark') === '1',
  toggleDark: () => set((s) => {
    const next = !s.dark;
    localStorage.setItem('dark', next ? '1' : '0');
    document.documentElement.classList.toggle('dark', next);
    return { dark: next };
  }),
  initDark: () => set((s) => {
    document.documentElement.classList.toggle('dark', s.dark);
    return {};
  }),
}));
