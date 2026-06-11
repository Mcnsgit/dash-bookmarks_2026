import { useUI } from '../store.js';
import { LayoutGrid, List } from 'lucide-react';

export default function ViewToggle() {
  const { view, setView } = useUI();
  return (
    <div className="inline-flex items-center bg-ink-100 dark:bg-ink-800 rounded-lg p-0.5">
      <button className={`p-1.5 rounded-md ${view === 'grid' ? 'bg-white dark:bg-ink-900 shadow-soft' : ''}`}
              onClick={() => setView('grid')} title="Grid"><LayoutGrid className="w-4 h-4" /></button>
      <button className={`p-1.5 rounded-md ${view === 'list' ? 'bg-white dark:bg-ink-900 shadow-soft' : ''}`}
              onClick={() => setView('list')} title="List"><List className="w-4 h-4" /></button>
    </div>
  );
}
