import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import LoginView from './views/LoginView.jsx';
import OidcCallbackView from './views/OidcCallbackView.jsx';
import DashboardView from './views/DashboardView.jsx';
import BookmarksView from './views/BookmarksView.jsx';
import ReadingListView from './views/ReadingListView.jsx';
import SessionsView from './views/SessionsView.jsx';
import NotesView from './views/NotesView.jsx';
import TagsView from './views/TagsView.jsx';
import ImportView from './views/ImportView.jsx';
import SettingsView from './views/SettingsView.jsx';
import { useUI } from './store.js';
import { useAuth } from './auth.js';
import { connectWs } from './api.js';

export default function App() {
  const initDark = useUI((s) => s.initDark);
  const { init: initAuth, ready } = useAuth();
  useEffect(() => { initDark(); initAuth(); connectWs(); }, [initDark, initAuth]);

  if (!ready) {
    return <div className="min-h-screen grid place-items-center text-sm text-ink-500">Loading…</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route path="/oidc/callback" element={<OidcCallbackView />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<DashboardView />} />
        <Route path="bookmarks" element={<BookmarksView />} />
        <Route path="bookmarks/folder/:folderId" element={<BookmarksView />} />
        <Route path="bookmarks/tag/:tag" element={<BookmarksView />} />
        <Route path="reading" element={<ReadingListView />} />
        <Route path="sessions" element={<SessionsView />} />
        <Route path="notes"    element={<NotesView />} />
        <Route path="tags"     element={<TagsView />} />
        <Route path="import"   element={<ImportView />} />
        <Route path="settings" element={<SettingsView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
