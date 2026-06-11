import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bookmark, BookOpen, FolderTree, Tags, Layers, NotebookPen, ArrowRight, Globe } from 'lucide-react';
import { api } from '../api.js';
import BookmarkCard from '../components/BookmarkCard.jsx';
import EmptyState from '../components/EmptyState.jsx';

const Card = ({ to, icon: Icon, label, value, hint, color }) => (
  <Link to={to} className="card p-5 flex items-center gap-4 hover:shadow-elev transition-shadow group">
    <div className={`w-12 h-12 rounded-xl grid place-items-center text-white ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="min-w-0">
      <div className="text-xs uppercase tracking-wider text-ink-400">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-ink-500">{hint}</div>}
    </div>
    <ArrowRight className="w-4 h-4 ml-auto text-ink-300 group-hover:text-brand-600 group-hover:translate-x-1 transition" />
  </Link>
);

export default function DashboardView() {
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: () => api.get('/stats') });
  const { data: pinned = [] } = useQuery({ queryKey: ['bookmarks', { pinned: true }], queryFn: () => api.get('/bookmarks', { pinned: 'true', limit: 8 }) });
  const { data: recent = [] } = useQuery({ queryKey: ['bookmarks', { sort: 'recent' }],  queryFn: () => api.get('/bookmarks', { sort: 'recent', limit: 12 }) });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-ink-500">Here’s a quick overview of your library.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card to="/bookmarks" icon={Bookmark}    label="Bookmarks"    value={stats?.bookmarks ?? '—'} color="bg-gradient-to-br from-brand-500 to-brand-700" />
        <Card to="/reading"   icon={BookOpen}    label="Reading list" value={stats?.reading?.unread ?? '—'} hint={`${stats?.reading?.read ?? 0} read`} color="bg-gradient-to-br from-amber-500 to-rose-500" />
        <Card to="/sessions"  icon={Layers}      label="Tab sessions" value={stats?.sessions ?? '—'} color="bg-gradient-to-br from-emerald-500 to-teal-600" />
        <Card to="/tags"      icon={Tags}        label="Tags"         value={stats?.tags ?? '—'} hint={`${stats?.folders ?? 0} folders`} color="bg-gradient-to-br from-sky-500 to-indigo-600" />
      </div>

      {pinned.length > 0 && (
        <section className="mt-10">
          <div className="flex items-end justify-between mb-3">
            <h2 className="text-lg font-semibold">Pinned</h2>
            <Link className="text-xs text-brand-600 hover:underline" to="/bookmarks?pinned=true">View all</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pinned.map((b) => <BookmarkCard key={b.id} b={b} />)}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-lg font-semibold">Recently added</h2>
          <Link className="text-xs text-brand-600 hover:underline" to="/bookmarks">View all</Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState icon={Bookmark} title="No bookmarks yet"
            description="Click the Add button at the top to save your first link, or import from your browser."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recent.map((b) => <BookmarkCard key={b.id} b={b} />)}
          </div>
        )}
      </section>

      {stats?.topDomains?.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Top domains</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {stats.topDomains.map((d) => (
              <div key={d.domain} className="card p-3 flex items-center gap-3">
                <Globe className="w-4 h-4 text-ink-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{d.domain}</div>
                  <div className="text-xs text-ink-400">{d.n} bookmarks</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
