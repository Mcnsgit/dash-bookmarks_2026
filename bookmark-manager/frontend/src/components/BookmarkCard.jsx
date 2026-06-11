import { ExternalLink, Pin, Archive, Trash2, RefreshCw, Star } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../api.js';

export default function BookmarkCard({ b, layout = 'grid' }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['bookmarks'] });

  const del      = useMutation({ mutationFn: () => api.del(`/bookmarks/${b.id}`),                onSuccess: () => { toast.success('Deleted'); refresh(); } });
  const arch     = useMutation({ mutationFn: () => api.post(`/bookmarks/${b.id}/archive`),       onSuccess: refresh });
  const pin      = useMutation({ mutationFn: () => api.patch(`/bookmarks/${b.id}`, { is_pinned: !b.is_pinned }), onSuccess: refresh });
  const rescreen = useMutation({ mutationFn: () => api.post(`/bookmarks/${b.id}/rescreenshot`),  onSuccess: () => { toast.success('Capturing…'); setTimeout(refresh, 1500); } });
  const visit    = () => api.post(`/bookmarks/${b.id}/visit`).catch(() => {});

  const preview = b.screenshot_path || b.og_image_url;

  if (layout === 'list') {
    return (
      <div className="card p-3 flex items-center gap-3 group">
        <img src={b.favicon_url} alt="" className="w-6 h-6 rounded shrink-0" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <a href={b.url} target="_blank" rel="noreferrer" onClick={visit}
               className="text-sm font-medium truncate hover:text-brand-600">{b.title}</a>
            {b.is_pinned && <Pin className="w-3 h-3 text-brand-500" />}
          </div>
          <div className="text-xs text-ink-400 truncate">{b.url}</div>
          {b.tags?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {b.tags.map((t) => <span key={t.id} className="chip" style={{ borderColor: t.color }}>#{t.name}</span>)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button className="btn-ghost p-1" title="Pin"      onClick={() => pin.mutate()}><Pin className="w-4 h-4" /></button>
          <button className="btn-ghost p-1" title="Archive"  onClick={() => arch.mutate()}><Archive className="w-4 h-4" /></button>
          <button className="btn-ghost p-1" title="Re-shot"  onClick={() => rescreen.mutate()}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-ghost p-1" title="Open"     onClick={() => { visit(); window.open(b.url, '_blank'); }}><ExternalLink className="w-4 h-4" /></button>
          <button className="btn-ghost p-1 text-red-500" title="Delete" onClick={() => del.mutate()}><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden group flex flex-col">
      <a href={b.url} target="_blank" rel="noreferrer" onClick={visit}
         className="block aspect-[16/10] bg-ink-100 dark:bg-ink-900 relative overflow-hidden">
        {preview ? (
          <img src={preview} alt="" loading="lazy"
               className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
               onError={(e) => (e.currentTarget.style.display = 'none')} />
        ) : (
          <div className="w-full h-full grid place-items-center text-ink-400">
            <div className="text-center">
              <div className="text-4xl font-bold opacity-30 truncate px-4">{(b.domain || b.title || '?').slice(0, 16)}</div>
              <div className="text-xs mt-1">no preview</div>
            </div>
          </div>
        )}
        {b.is_pinned && <div className="absolute top-2 left-2 bg-brand-600 text-white rounded-full p-1"><Pin className="w-3 h-3" /></div>}
      </a>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          {b.favicon_url && <img src={b.favicon_url} alt="" className="w-4 h-4 rounded shrink-0" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />}
          <a href={b.url} target="_blank" rel="noreferrer" onClick={visit}
             className="text-sm font-medium truncate hover:text-brand-600">{b.title}</a>
        </div>
        <div className="text-xs text-ink-400 truncate">{b.domain || b.url}</div>
        {b.tags?.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {b.tags.slice(0, 4).map((t) => <span key={t.id} className="chip">#{t.name}</span>)}
          </div>
        )}
        <div className="flex items-center gap-1 mt-auto pt-2 opacity-0 group-hover:opacity-100 transition">
          <button className="btn-ghost p-1" title={b.is_pinned ? 'Unpin' : 'Pin'} onClick={() => pin.mutate()}><Pin className="w-4 h-4" /></button>
          <button className="btn-ghost p-1" title="Archive"   onClick={() => arch.mutate()}><Archive className="w-4 h-4" /></button>
          <button className="btn-ghost p-1" title="Re-shot"   onClick={() => rescreen.mutate()}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-ghost p-1 ml-auto text-red-500" title="Delete" onClick={() => del.mutate()}><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
