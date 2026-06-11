import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import DashboardView from './views/DashboardView.jsx';
import BookmarksView from './views/BookmarksView.jsx';
import ReadingListView from './views/ReadingListView.jsx';
import SessionsView from './views/SessionsView.jsx';
import NotesView from './views/NotesView.jsx';
import TagsView from './views/TagsView.jsx';
import ImportView from './views/ImportView.jsx';
import SettingsView from './views/SettingsView.jsx';
import { useUI } from './store.js';
import { connectWs } from './api.js';

export default function App() {
  const initDark = useUI((s) => s.initDark);
  useEffect(() => { initDark(); connectWs(); }, [initDark]);
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
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
