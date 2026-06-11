import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckSquare, Square, ExternalLink, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api.js';

export default function VikunjaWidget() {
  const { data: status } = useQuery({ queryKey: ['vikunja-status'], queryFn: () => api.get('/vikunja/status') });
  const { data: tasks = [], refetch } = useQuery({
    queryKey: ['vikunja-tasks'],
    queryFn: () => api.get('/vikunja/tasks', { filter: 'open' }),
    enabled: !!status?.configured,
  });

  if (!status?.configured) {
    return (
      <div className="text-xs text-ink-500 flex items-start gap-2 p-2 rounded-lg bg-ink-100 dark:bg-ink-800">
        <AlertCircle className="w-4 h-4 mt-0.5" />
        <div>
          <div className="font-medium">Vikunja not configured</div>
          <div>Set VIKUNJA_API_URL and VIKUNJA_TOKEN in .env</div>
        </div>
      </div>
    );
  }

  const toggle = async (t) => {
    try {
      await api.post(`/vikunja/tasks/${t.id}/done`, { done: !t.done });
      toast.success(t.done ? 'Reopened' : 'Marked done');
      refetch();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs uppercase tracking-wider text-ink-400 px-1 mb-1">Vikunja tasks</div>
      {tasks.length === 0 && <div className="text-xs text-ink-500 px-1">No open tasks 🎉</div>}
      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
        {tasks.slice(0, 8).map((t) => (
          <div key={t.id} className="flex items-center gap-2 text-sm group px-1">
            <button onClick={() => toggle(t)} className="text-ink-400 hover:text-brand-600">
              {t.done ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>
            <span className={`truncate flex-1 ${t.done ? 'line-through text-ink-400' : ''}`}>{t.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
