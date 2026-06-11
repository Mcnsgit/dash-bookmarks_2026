import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, Filter } from 'lucide-react';
import { api } from '../api.js';
import BookmarkCard from '../components/BookmarkCard.jsx';
import ViewToggle from '../components/ViewToggle.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useUI } from '../store.js';

export default function BookmarksView() {
  const { folderId, tag } = useParams();
  const [params, setParams] = useSearchParams();
  const [sort, setSort] = useState(params.get('sort') || 'recent');
  const [archived, setArchived] = useState(params.get('archived') === 'true');
  const view = useUI((s) => s.view);

  const query = useMemo(() => {
    const q = { sort, limit: 500 };
    if (folderId) q.folder_id = folderId;
    if (tag) q.tag = tag;
    if (params.get('q')) q.q = params.get('q');
    if (params.get('domain')) q.domain = params.get('domain');
    if (params.get('pinned') === 'true') q.pinned = 'true';
    q.archived = archived ? 'true' : 'false';
    return q;
  }, [folderId, tag, params, sort, archived]);

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ['bookmarks', query],
    queryFn: () => api.get('/bookmarks', query),
  });
  const { data: folders = [] } = useQuery({ queryKey: ['folders'], queryFn: () => api.get('/folders') });
  const folder = folders.find((f) => f.id === folderId);

  const heading = tag ? `#${tag}` : (folder?.name || 'All bookmarks');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold truncate">{heading}</h1>
          <p className="text-sm text-ink-500">{bookmarks.length} bookmark{bookmarks.length === 1 ? '' : 's'}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <label className="text-xs text-ink-500 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" />
            <select className="input py-1.5" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recent">Recently added</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title (A→Z)</option>
              <option value="domain">Domain</option>
              <option value="most_visited">Most visited</option>
            </select>
          </label>
          <label className="text-xs text-ink-500 flex items-center gap-2">
            <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
            Archived
          </label>
          <ViewToggle />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-48" />)}
        </div>
      ) : bookmarks.length === 0 ? (
        <EmptyState icon={Bookmark} title="No bookmarks here" description="Add new bookmarks or import from your browser." />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {bookmarks.map((b) => <BookmarkCard key={b.id} b={b} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {bookmarks.map((b) => <BookmarkCard key={b.id} b={b} layout="list" />)}
        </div>
      )}
    </div>
  );
}
