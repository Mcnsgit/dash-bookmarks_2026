import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { Plus, Trash2, NotebookPen, Eye, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';

export default function NotesView() {
  const qc = useQueryClient();
  const { data: notes = [] } = useQuery({ queryKey: ['notes'], queryFn: () => api.get('/notes') });
  const [activeId, setActiveId] = useState(null);
  const [mode, setMode] = useState('edit');
  const active = notes.find((n) => n.id === activeId);
  const [draft, setDraft] = useState({ title: '', content: '' });

  useEffect(() => {
    if (active) setDraft({ title: active.title, content: active.content || '' });
  }, [active?.id]);

  const create = useMutation({
    mutationFn: () => api.post('/notes', { title: 'New note', content: '' }),
    onSuccess: (n) => { qc.invalidateQueries({ queryKey: ['notes'] }); setActiveId(n.id); setMode('edit'); },
  });
  const update = useMutation({
    mutationFn: () => api.patch(`/notes/${activeId}`, draft),
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries({ queryKey: ['notes'] }); },
  });
  const del = useMutation({
    mutationFn: (id) => api.del(`/notes/${id}`),
    onSuccess: () => { setActiveId(null); qc.invalidateQueries({ queryKey: ['notes'] }); },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center mb-5">
        <div>
          <h1 className="text-2xl font-semibold">Notes</h1>
          <p className="text-sm text-ink-500">Markdown notes attached to your library.</p>
        </div>
        <button className="btn-primary ml-auto" onClick={() => create.mutate()}><Plus className="w-4 h-4" /> New note</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <aside className="card p-2 max-h-[70vh] overflow-y-auto">
          {notes.length === 0 && <div className="p-4 text-sm text-ink-400">No notes yet</div>}
          {notes.map((n) => (
            <button key={n.id} onClick={() => setActiveId(n.id)}
              className={`w-full text-left px-3 py-2 rounded-md ${activeId === n.id ? 'bg-brand-50 dark:bg-ink-800' : 'hover:bg-ink-50 dark:hover:bg-ink-800'}`}>
              <div className="text-sm font-medium truncate">{n.title || 'Untitled'}</div>
              <div className="text-xs text-ink-400 truncate">{(n.content || '').slice(0, 80) || 'Empty'}</div>
            </button>
          ))}
        </aside>

        <section className="card p-4 min-h-[60vh]">
          {!active ? (
            <EmptyState icon={NotebookPen} title="Select a note" description="Pick one from the left, or create a new one." />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <input className="input flex-1 text-base font-semibold"
                       value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                <button className="btn-soft" onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}>
                  {mode === 'edit' ? <><Eye className="w-4 h-4" /> Preview</> : <><Pencil className="w-4 h-4" /> Edit</>}
                </button>
                <button className="btn-primary" disabled={update.isPending} onClick={() => update.mutate()}>Save</button>
                <button className="btn-ghost text-red-500" onClick={() => confirm('Delete this note?') && del.mutate(active.id)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {mode === 'edit' ? (
                <textarea rows={20} className="input font-mono text-sm"
                          placeholder="Write markdown…"
                          value={draft.content}
                          onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
              ) : (
                <article className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{draft.content || '*Nothing here yet.*'}</ReactMarkdown>
                </article>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
