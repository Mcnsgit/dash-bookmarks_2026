import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { Folder, FolderOpen } from 'lucide-react';
import { api } from '../api.js';

export default function FolderTreeNav() {
  const { data: folders = [] } = useQuery({ queryKey: ['folders'], queryFn: () => api.get('/folders') });
  const byParent = new Map();
  folders.forEach((f) => {
    const k = f.parent_id || 'root';
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k).push(f);
  });

  const Node = ({ f, depth }) => {
    const kids = byParent.get(f.id) || [];
    return (
      <div>
        <NavLink
          to={`/bookmarks/folder/${f.id}`}
          className={({ isActive }) =>
            `flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-ink-100 dark:hover:bg-ink-800 ${
              isActive ? 'bg-ink-100 dark:bg-ink-800 font-medium text-brand-600 dark:text-brand-300' : 'text-ink-700 dark:text-ink-200'
            }`
          }
          style={{ paddingLeft: 8 + depth * 12 }}
        >
          {kids.length ? <FolderOpen className="w-4 h-4" style={{ color: f.color }} /> : <Folder className="w-4 h-4" style={{ color: f.color }} />}
          <span className="truncate flex-1">{f.name}</span>
          <span className="text-xs text-ink-400">{f.bookmark_count || 0}</span>
        </NavLink>
        {kids.map((c) => <Node key={c.id} f={c} depth={depth + 1} />)}
      </div>
    );
  };

  const roots = byParent.get('root') || [];
  if (!roots.length) return <div className="px-3 py-2 text-xs text-ink-400">No folders yet</div>;
  return <div className="flex flex-col">{roots.map((f) => <Node key={f.id} f={f} depth={0} />)}</div>;
}
