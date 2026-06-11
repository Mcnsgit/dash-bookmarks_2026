import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../api.js';

export default function AddBookmarkModal({ onClose, defaultFolder = null }) {
  const [form, setForm] = useState({ url: '', title: '', description: '', folder_id: defaultFolder, tags: '' });
  const { data: folders = [] } = useQuery({ queryKey: ['folders'], queryFn: () => api.get('/folders') });
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (b) => api.post('/bookmarks', b),
    onSuccess: () => {
      toast.success('Bookmark added');
      qc.invalidateQueries({ queryKey: ['bookmarks'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      onClose();
    },
    onError: (e) => toast.error(e.message || 'Failed'),
  });

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    if (!form.url.trim()) return toast.error('URL required');
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    m.mutate({ ...form, tags });
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <form onSubmit={submit} className="card w-[min(520px,92vw)] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Add bookmark</h2>
          <button type="button" className="btn-ghost p-1" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="flex flex-col gap-3">
          <label className="text-xs text-ink-500">URL
            <input autoFocus className="input mt-1" placeholder="https://example.com" value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </label>
          <label className="text-xs text-ink-500">Title <span className="text-ink-400">(optional, auto from page)</span>
            <input className="input mt-1" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="text-xs text-ink-500">Description <span className="text-ink-400">(optional)</span>
            <textarea rows={2} className="input mt-1" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-ink-500">Folder
              <select className="input mt-1" value={form.folder_id || ''}
                onChange={(e) => setForm({ ...form, folder_id: e.target.value || null })}>
                <option value="">— None —</option>
                {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
            <label className="text-xs text-ink-500">Tags <span className="text-ink-400">(comma-separated)</span>
              <input className="input mt-1" placeholder="dev, tools" value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </label>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" className="btn-soft" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={m.isPending}>
            {m.isPending ? 'Saving…' : 'Save bookmark'}
          </button>
        </div>
      </form>
    </div>
  );
}
