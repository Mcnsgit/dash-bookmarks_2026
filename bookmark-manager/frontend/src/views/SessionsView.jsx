import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Layers, ExternalLink, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';

export default function SessionsView() {
  const qc = useQueryClient();
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions'], queryFn: () => api.get('/sessions') });
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState(null);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center mb-5">
        <div>
          <h1 className="text-2xl font-semibold">Tab sessions</h1>
          <p className="text-sm text-ink-500">Save and restore groups of tabs.</p>
        </div>
        <button className="btn-primary ml-auto" onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> New session</button>
      </div>

      {sessions.length === 0
        ? <EmptyState icon={Layers} title="No sessions yet" description="Click 'New session' and paste a list of URLs to save them as a group." />
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((s) => (
              <button key={s.id} onClick={() => setActive(s)}
                      className="card p-4 text-left hover:shadow-elev transition-shadow group">
                <div className="text-xs text-ink-400">{s.tab_count} tabs</div>
                <div className="font-semibold mt-0.5 truncate">{s.name}</div>
                {s.description && <div className="text-xs text-ink-500 mt-1 line-clamp-2">{s.description}</div>}
              </button>
            ))}
          </div>
        )}

      {creating && <CreateSession onClose={() => setCreating(false)} onCreated={() => qc.invalidateQueries({ queryKey: ['sessions'] })} />}
      {active   && <SessionDetail id={active.id} onClose={() => setActive(null)} onChange={() => qc.invalidateQueries({ queryKey: ['sessions'] })} />}
    </div>
  );
}

function CreateSession({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [urls, setUrls] = useState('');
  const m = useMutation({
    mutationFn: (b) => api.post('/sessions', b),
    onSuccess: () => { onCreated(); onClose(); toast.success('Session created'); },
  });
  const submit = (e) => {
    e.preventDefault();
    const tabs = urls.split(/\n+/).map((u) => u.trim()).filter(Boolean).map((u) => ({ url: u }));
    if (!name || tabs.length === 0) return toast.error('Name and at least one URL required');
    m.mutate({ name, description, tabs });
  };
  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 grid place-items-center p-4" onClick={onClose}>
      <form onSubmit={submit} className="card w-[min(560px,92vw)] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">New session</h2>
          <button type="button" className="btn-ghost p-1" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <label className="text-xs text-ink-500">Name
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-xs text-ink-500 mt-3 block">Description (optional)
          <input className="input mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="text-xs text-ink-500 mt-3 block">URLs (one per line)
          <textarea rows={8} className="input mt-1 font-mono text-xs" placeholder="https://..." value={urls} onChange={(e) => setUrls(e.target.value)} />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-soft" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={m.isPending}>{m.isPending ? 'Saving…' : 'Save session'}</button>
        </div>
      </form>
    </div>
  );
}

function SessionDetail({ id, onClose, onChange }) {
  const { data: s } = useQuery({ queryKey: ['session', id], queryFn: () => api.get(`/sessions/${id}`) });
  const del = useMutation({ mutationFn: () => api.del(`/sessions/${id}`), onSuccess: () => { onChange(); onClose(); } });
  const openAll = () => (s?.tabs || []).forEach((t) => window.open(t.url, '_blank'));
  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 grid place-items-center p-4" onClick={onClose}>
      <div className="card w-[min(680px,92vw)] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-lg font-semibold">{s?.name || 'Loading…'}</h2>
            {s?.description && <p className="text-sm text-ink-500">{s.description}</p>}
          </div>
          <button className="btn-ghost p-1" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="mt-3 flex flex-col gap-1.5 max-h-80 overflow-y-auto">
          {(s?.tabs || []).map((t) => (
            <a key={t.id} href={t.url} target="_blank" rel="noreferrer"
               className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-md hover:bg-ink-100 dark:hover:bg-ink-800">
              {t.favicon_url && <img src={t.favicon_url} alt="" className="w-4 h-4 rounded" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />}
              <span className="truncate flex-1">{t.title || t.url}</span>
              <ExternalLink className="w-3.5 h-3.5 text-ink-400" />
            </a>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button className="btn-ghost text-red-500" onClick={() => confirm('Delete this session?') && del.mutate()}>
            <Trash2 className="w-4 h-4" /> Delete session
          </button>
          <button className="btn-primary" onClick={openAll}>Open all tabs</button>
        </div>
      </div>
    </div>
  );
}
