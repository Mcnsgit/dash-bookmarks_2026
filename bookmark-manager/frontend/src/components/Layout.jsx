import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  Bookmark, BookOpen, FolderTree, Tags, Layers, NotebookPen,
  Search, Plus, Upload, Settings, Sun, Moon, Menu, Sparkles, LogOut, User
} from 'lucide-react';
import { useUI } from '../store.js';
import { useAuth } from '../auth.js';
import SearchPalette from './SearchPalette.jsx';
import FolderTreeNav from './FolderTreeNav.jsx';
import VikunjaWidget from './VikunjaWidget.jsx';
import AddBookmarkButton from './AddBookmarkButton.jsx';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';

const NavItem = ({ to, icon: Icon, children, end }) => (
  <NavLink
    end={end}
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
        isActive ? 'bg-brand-600 text-white shadow-soft' : 'text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800'
      }`
    }
  >
    <Icon className="w-4 h-4" />
    <span className="truncate">{children}</span>
  </NavLink>
);

export default function Layout() {
  const { sidebarOpen, toggleSidebar, dark, toggleDark } = useUI();
  const { user, status, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => { /* close on nav on mobile */ }, [pathname]);
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api.get('/stats') });

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-[width] overflow-hidden border-r border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 shrink-0`}>
        <div className="h-full flex flex-col">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-ink-100 dark:border-ink-800">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 grid place-items-center text-white">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold leading-none">Bookmark OS</div>
              <div className="text-xs text-ink-500">Self-hosted</div>
            </div>
          </div>

          <nav className="px-2 py-3 flex flex-col gap-1">
            <NavItem to="/"          icon={Sparkles}    end>Dashboard</NavItem>
            <NavItem to="/bookmarks" icon={Bookmark}>All bookmarks</NavItem>
            <NavItem to="/reading"   icon={BookOpen}>Reading list {stats.data?.reading?.unread ? <span className="ml-auto chip">{stats.data.reading.unread}</span> : null}</NavItem>
            <NavItem to="/sessions"  icon={Layers}>Tab sessions</NavItem>
            <NavItem to="/notes"     icon={NotebookPen}>Notes</NavItem>
            <NavItem to="/tags"      icon={Tags}>Tags</NavItem>
          </nav>

          <div className="px-4 pt-2 text-xs uppercase tracking-wider text-ink-400">Folders</div>
          <div className="px-2 pb-3 flex-1 overflow-y-auto">
            <FolderTreeNav />
          </div>

          <div className="border-t border-ink-100 dark:border-ink-800 p-3">
            <VikunjaWidget />
          </div>

          <div className="border-t border-ink-100 dark:border-ink-800 p-2 flex flex-col gap-1">
            <NavItem to="/import"   icon={Upload}>Import</NavItem>
            <NavItem to="/settings" icon={Settings}>Settings</NavItem>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-ink-200 dark:border-ink-700 px-3 flex items-center gap-2 bg-white/80 dark:bg-ink-900/80 backdrop-blur">
          <button className="btn-ghost p-2" onClick={toggleSidebar} aria-label="Toggle sidebar">
            <Menu className="w-5 h-5" />
          </button>
          <SearchPalette />
          <div className="flex-1" />
          <AddBookmarkButton />
          <button className="btn-ghost p-2" onClick={toggleDark} aria-label="Toggle theme">
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          {status?.auth_enabled && user && (
            <div className="relative group">
              <button className="btn-ghost p-2 flex items-center gap-2" title={user.email}>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 grid place-items-center text-white text-xs font-semibold">
                  {(user.display_name || user.email || '?').slice(0, 1).toUpperCase()}
                </div>
              </button>
              <div className="absolute right-0 top-full mt-1 w-56 card p-1 hidden group-hover:flex group-focus-within:flex flex-col z-30">
                <div className="px-3 py-2 border-b border-ink-100 dark:border-ink-700">
                  <div className="text-sm font-medium truncate">{user.display_name || 'Me'}</div>
                  <div className="text-xs text-ink-400 truncate">{user.email}</div>
                </div>
                <button className="text-left px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-800 rounded-md flex items-center gap-2"
                        onClick={() => nav('/settings')}>
                  <Settings className="w-4 h-4" /> Settings & tokens
                </button>
                <button className="text-left px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-ink-800 rounded-md text-red-600 dark:text-red-400 flex items-center gap-2"
                        onClick={() => { logout(); nav('/login'); }}>
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </div>
          )}
        </header>
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
