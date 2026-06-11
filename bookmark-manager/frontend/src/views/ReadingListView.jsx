import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, CheckCircle, Circle, Plus, Trash2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';

export default function ReadingListView() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ['reading-list'], queryFn: () => api.get('/reading-list') });
  const [form, setForm] = useState({ url: '', title: '', priority: 2 });

  const add  = useMutation({ mutationFn: (b) => api.post('/reading-list', b),                onSuccess: () => { setForm({ url: '', title: '', priority: 2 }); qc.invalidateQueries({ queryKey: ['reading-list'] }); toast.success('Added'); } });
  const toggle = useMutation({ mutationFn: ({ id, is_read }) => api.patch(`/reading-list/${id}`, { is_read }), onSuccess: () => qc.invalidateQueries({ queryKey: ['reading-list'] }) });
  const del  = useMutation({ mutationFn: (id) => api.del(`/reading-list/${id}`),              onSuccess: () => qc.invalidateQueries({ queryKey: ['reading-list'] }) });
  const setPrio = useMutation({ mutationFn: ({ id, priority }) => api.patch(`/reading-list/${id}`, { priority }), onSuccess: () => qc.invalidateQueries({ queryKey: ['reading-list'] }) });

  const submit = (e) => {
    e.preventDefault();
    if (!form.url.trim()) return toast.error('URL required');
    add.mutate(form);
  };

  const groups = { 1: [], 2: [], 3: [] };
  items.filter((i) => !i.is_read).forEach((i) => groups[i.priority || 2].push(i));
  const done = items.filter((i) => i.is_read);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Reading list</h1>
        <p className="text-sm text-ink-500">Queue up things you want to read later, prioritized.</p>
      </div>

      <form onSubmit={submit} className="card p-3 mb-6 flex flex-wrap gap-2 items-end">
        <label className="text-xs text-ink-500 flex-1 min-w-[200px]">URL
          <input className="input mt-1" placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        </label>
        <label className="text-xs text-ink-500 flex-1 min-w-[200px]">Title (optional)
          <input className="input mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label className="text-xs text-ink-500">Priority
          <select className="input mt-1" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value, 10) })}>
            <option value={1}>High</option><option value={2}>Medium</option><option value={3}>Low</option>
          </select>
        </label>
        <button type="submit" className="btn-primary"><Plus className="w-4 h-4" /> Add</button>
      </form>

      {items.length === 0 && <EmptyState icon={BookOpen} title="Nothing to read yet" description="Add a URL above to get started." />}

      {[1, 2, 3].map((p) => groups[p].length > 0 && (
        <section key={p} className="mb-5">
          <h2 className="text-xs uppercase tracking-wider text-ink-400 mb-2">
            {p === 1 ? 'High priority' : p === 2 ? 'Medium' : 'Low'}
          </h2>
          <div className="flex flex-col gap-2">
            {groups[p].map((i) => (
              <Item key={i.id} item={i}
                onToggle={() => toggle.mutate({ id: i.id, is_read: true })}
                onDelete={() => del.mutate(i.id)}
                onPriority={(v) => setPrio.mutate({ id: i.id, priority: v })}
              />
            ))}
          </div>
        </section>
      ))}

      {done.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-wider text-ink-400 mb-2">Read</h2>
          <div className="flex flex-col gap-2 opacity-70">
            {done.map((i) => (
              <Item key={i.id} item={i} onToggle={() => toggle.mutate({ id: i.id, is_read: false })} onDelete={() => del.mutate(i.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Item({ item, onToggle, onDelete, onPriority }) {
  return (
    <div className="card p-3 flex items-center gap-3 group">
      <button onClick={onToggle} className="text-ink-400 hover:text-brand-600">
        {item.is_read ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5" />}
      </button>
      {item.favicon_url && <img src={item.favicon_url} alt="" className="w-4 h-4 rounded" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />}
      <div className="min-w-0 flex-1">
        <a href={item.url} target="_blank" rel="noreferrer" className="text-sm font-medium truncate hover:text-brand-600">{item.title || item.url}</a>
        <div className="text-xs text-ink-400 truncate">{item.url}</div>
      </div>
      {onPriority && !item.is_read && (
        <select className="input py-1 text-xs w-24" value={item.priority}
                onChange={(e) => onPriority(parseInt(e.target.value, 10))}>
          <option value={1}>High</option><option value={2}>Medium</option><option value={3}>Low</option>
        </select>
      )}
      <a href={item.url} target="_blank" rel="noreferrer" className="btn-ghost p-1" title="Open"><ExternalLink className="w-4 h-4" /></a>
      <button onClick={onDelete} className="btn-ghost p-1 text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
    </div>
  );
}
