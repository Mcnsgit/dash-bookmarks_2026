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
    <div className="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-md grid place-items-center p-4" onClick={onClose}>
      {/* Explicit solid background (bg-white dark:bg-ink-900) ensures zero bleed-through */}
      <form
        onSubmit={submit}
        className="card bg-white dark:bg-ink-900 shadow-2xl rounded-2xl border border-ink-100 dark:border-ink-800 w-[min(520px,92vw)] p-6 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">Add bookmark</h2>
          <button type="button" className="btn-ghost p-1 rounded-lg text-ink-400 hover:text-ink-600" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3.5">
          <label className="text-xs font-medium text-ink-600 dark:text-ink-300">
            URL
            <input
              autoFocus
              className="input mt-1 w-full"
              placeholder="https://example.com"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </label>

          <label className="text-xs font-medium text-ink-600 dark:text-ink-300">
            Title <span className="text-ink-400 font-normal">(optional, auto from page)</span>
            <input
              className="input mt-1 w-full"
              placeholder="Auto-detected if blank"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>

          <label className="text-xs font-medium text-ink-600 dark:text-ink-300">
            Description <span className="text-ink-400 font-normal">(optional)</span>
            <textarea
              rows={2}
              className="input mt-1 w-full resize-none"
              placeholder="Notes or summary..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-ink-600 dark:text-ink-300">
              Folder
              <select
                className="input mt-1 w-full"
                value={form.folder_id || ''}
                onChange={(e) => setForm({ ...form, folder_id: e.target.value || null })}
              >
                <option value="">— None —</option>
                {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>

            <label className="text-xs font-medium text-ink-600 dark:text-ink-300">
              Tags <span className="text-ink-400 font-normal">(comma-separated)</span>
              <input
                className="input mt-1 w-full"
                placeholder="dev, tools"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button type="button" className="btn-soft px-4 py-2" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary px-4 py-2 font-medium" disabled={m.isPending}>
            {m.isPending ? 'Saving…' : 'Save bookmark'}
          </button>
        </div>
      </form>
    </div>
  );
}
