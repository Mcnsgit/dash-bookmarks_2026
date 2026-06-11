import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tags, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';

export default function TagsView() {
  const qc = useQueryClient();
  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: () => api.get('/tags') });
  const del = useMutation({ mutationFn: (id) => api.del(`/tags/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }) });
  if (tags.length === 0) return (
    <div className="p-6"><EmptyState icon={Tags} title="No tags yet" description="Tags appear automatically when you add them to bookmarks." /></div>
  );
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Tags</h1>
      <p className="text-sm text-ink-500 mb-5">{tags.length} tag{tags.length === 1 ? '' : 's'}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {tags.map((t) => (
          <div key={t.id} className="card p-3 flex items-center gap-2 group">
            <span className="w-3 h-3 rounded-full" style={{ background: t.color }} />
            <Link to={`/bookmarks/tag/${t.name}`} className="text-sm font-medium hover:text-brand-600 truncate flex-1">#{t.name}</Link>
            <span className="chip">{t.bookmark_count || 0}</span>
            <button onClick={() => confirm('Delete tag?') && del.mutate(t.id)} className="btn-ghost p-1 text-red-500 opacity-0 group-hover:opacity-100">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
