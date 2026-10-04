import { ExternalLink, Pin, Archive, Trash2, RefreshCw, Star } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../api.js';

export default function BookmarkCard({ b, layout = 'grid' }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['bookmarks'] });

  const del = useMutation({ mutationFn: () => api.del(`/bookmarks/${b.id}`), onSuccess: () => { toast.success('Deleted'); refresh(); } });
  const arch = useMutation({ mutationFn: () => api.post(`/bookmarks/${b.id}/archive`), onSuccess: refresh });
  const pin = useMutation({ mutationFn: () => api.patch(`/bookmarks/${b.id}`, { is_pinned: !b.is_pinned }), onSuccess: refresh });
  const rescreen = useMutation({ mutationFn: () => api.post(`/bookmarks/${b.id}/rescreenshot`), onSuccess: () => { toast.success('Capturing…'); setTimeout(refresh, 1500); } });
  const visit = () => api.post(`/bookmarks/${b.id}/visit`).catch(() => { });

  const preview = b.screenshot_path || b.og_image_url;

  if (layout === 'list') {
    return (
      <div className="card p-3 flex items-center gap-3 group bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-xl">
        <img
          src={b.favicon_url}
          alt=""
          className="w-6 h-6 rounded shrink-0 object-contain"
          onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <a
              href={b.url}
              target="_blank"
              rel="noreferrer"
              onClick={visit}
              className="text-sm font-medium truncate hover:text-brand-600"
            >
              {b.title || b.domain}
            </a>
            {b.is_pinned && <Pin className="w-3.5 h-3.5 text-brand-500 fill-brand-500 shrink-0" />}
          </div>
          <div className="text-xs text-ink-400 truncate">{b.url}</div>
          {b.tags?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {b.tags.map((t) => <span key={t.id} className="chip" style={{ borderColor: t.color }}>#{t.name}</span>)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button className="btn-ghost p-1" title="Pin" onClick={() => pin.mutate()}><Pin className="w-4 h-4" /></button>
          <button className="btn-ghost p-1" title="Archive" onClick={() => arch.mutate()}><Archive className="w-4 h-4" /></button>
          <button className="btn-ghost p-1" title="Re-capture" onClick={() => rescreen.mutate()}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-ghost p-1" title="Open" onClick={() => { visit(); window.open(b.url, '_blank'); }}><ExternalLink className="w-4 h-4" /></button>
          <button className="btn-ghost p-1 text-red-500 hover:text-red-600" title="Delete" onClick={() => del.mutate()}><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden group flex flex-col bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-2xl shadow-sm hover:shadow-md transition">
      <a
        href={b.url}
        target="_blank"
        rel="noreferrer"
        onClick={visit}
        className="block aspect-[16/10] bg-ink-50 dark:bg-ink-950 relative overflow-hidden border-b border-ink-100 dark:border-ink-800"
      >
        {preview ? (
          <img
            src={preview}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        ) : (
          /* Clean placeholder replacing the broken oversized text-4xl */
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-ink-400">
            <div className="w-10 h-10 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center mb-2 shadow-inner">
              <ExternalLink className="w-5 h-5 text-ink-400 opacity-70" />
            </div>
            <div className="text-sm font-semibold text-ink-700 dark:text-ink-300 max-w-[85%] truncate text-center">
              {b.domain || b.title || 'Bookmark'}
            </div>
            <div className="text-[11px] text-ink-400 opacity-60 mt-0.5">Capturing preview…</div>
          </div>
        )}

        {b.is_pinned && (
          <div className="absolute top-2.5 left-2.5 bg-brand-600 text-white rounded-full p-1.5 shadow-md">
            <Pin className="w-3 h-3 fill-white" />
          </div>
        )}
      </a>

      <div className="p-3.5 flex flex-col gap-1.5 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          {b.favicon_url && (
            <img
              src={b.favicon_url}
              alt=""
              className="w-4 h-4 rounded shrink-0 object-contain"
              onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
            />
          )}
          <a
            href={b.url}
            target="_blank"
            rel="noreferrer"
            onClick={visit}
            className="text-sm font-medium truncate text-ink-900 dark:text-ink-100 hover:text-brand-600"
          >
            {b.title || b.domain}
          </a>
        </div>

        <div className="text-xs text-ink-400 truncate">{b.domain || b.url}</div>

        {b.tags?.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {b.tags.slice(0, 4).map((t) => (
              <span key={t.id} className="chip text-[11px] px-2 py-0.5 rounded-md bg-ink-50 dark:bg-ink-800 text-ink-600 dark:text-ink-300">
                #{t.name}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 mt-auto pt-2.5 opacity-0 group-hover:opacity-100 transition">
          <button className="btn-ghost p-1 text-ink-400 hover:text-ink-700 dark:hover:text-ink-200" title={b.is_pinned ? 'Unpin' : 'Pin'} onClick={() => pin.mutate()}>
            <Pin className="w-4 h-4" />
          </button>
          <button className="btn-ghost p-1 text-ink-400 hover:text-ink-700 dark:hover:text-ink-200" title="Archive" onClick={() => arch.mutate()}>
            <Archive className="w-4 h-4" />
          </button>
          <button className="btn-ghost p-1 text-ink-400 hover:text-ink-700 dark:hover:text-ink-200" title="Re-shot" onClick={() => rescreen.mutate()}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="btn-ghost p-1 ml-auto text-red-500 hover:text-red-600" title="Delete" onClick={() => del.mutate()}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
