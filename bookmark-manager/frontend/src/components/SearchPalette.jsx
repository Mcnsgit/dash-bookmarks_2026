import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';
import { useUI } from '../store.js';

export default function SearchPalette() {
  const { search, setSearch } = useUI();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { data } = useQuery({
    queryKey: ['search', search],
    queryFn: () => search ? api.get('/search', { query: search, limit: 20 }) : [],
    enabled: open && !!search,
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-500 text-sm w-72 max-w-full hover:bg-ink-200 dark:hover:bg-ink-700"
      >
        <Search className="w-4 h-4" />
        Search bookmarks…
        <span className="ml-auto text-xs text-ink-400">⌘K</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm grid place-items-start pt-24" onClick={() => setOpen(false)}>
          <div className="card w-[min(640px,92vw)] mx-auto overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-100 dark:border-ink-800">
              <Search className="w-4 h-4 text-ink-400" />
              <input
                autoFocus
                placeholder="Search by title, URL, domain…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
              />
              <button className="btn-ghost p-1" onClick={() => setOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {(data || []).length === 0 ? (
                <div className="p-6 text-center text-sm text-ink-400">{search ? 'No results' : 'Start typing to search…'}</div>
              ) : (data || []).map((b) => (
                <button
                  key={b.id}
                  onClick={() => { setOpen(false); nav(`/bookmarks?q=${encodeURIComponent(search)}`); window.open(b.url, '_blank'); }}
                  className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-ink-50 dark:hover:bg-ink-800"
                >
                  <img src={b.favicon_url} alt="" className="w-4 h-4 mt-0.5 rounded" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{b.title}</div>
                    <div className="text-xs text-ink-400 truncate">{b.url}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
