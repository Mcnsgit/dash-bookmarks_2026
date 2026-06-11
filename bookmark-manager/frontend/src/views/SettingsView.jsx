import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Trash2, FolderTree } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api.js';

export default function SettingsView() {
  const qc = useQueryClient();
  const { data: folders = [] } = useQuery({ queryKey: ['folders'], queryFn: () => api.get('/folders') });
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const { data: vikunjaStatus } = useQuery({ queryKey: ['vikunja-status'], queryFn: () => api.get('/vikunja/status') });

  const create = useMutation({
    mutationFn: () => api.post('/folders', { name, parent_id: parentId || null }),
    onSuccess: () => { setName(''); qc.invalidateQueries({ queryKey: ['folders'] }); toast.success('Folder created'); },
  });
  const del = useMutation({
    mutationFn: (id) => api.del(`/folders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Settings</h1>
      <p className="text-sm text-ink-500 mb-6">Configure folders, integrations, and preferences.</p>

      <section className="card p-5 mb-6">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2"><FolderTree className="w-4 h-4" /> Folders</h2>
        <div className="flex gap-2 mb-4">
          <input className="input flex-1" placeholder="New folder name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="input w-40" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">No parent</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <button className="btn-primary" disabled={!name || create.isPending} onClick={() => create.mutate()}>
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        <div className="divide-y divide-ink-100 dark:divide-ink-700">
          {folders.length === 0 && <div className="text-sm text-ink-400 py-3">No folders yet</div>}
          {folders.map((f) => (
            <div key={f.id} className="flex items-center gap-2 py-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: f.color }} />
              <span className="text-sm flex-1 truncate">{f.name}</span>
              <span className="chip">{f.bookmark_count || 0}</span>
              <button className="btn-ghost p-1 text-red-500" onClick={() => confirm('Delete folder?') && del.mutate(f.id)}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5 mb-6">
        <h2 className="text-base font-semibold mb-3">Vikunja</h2>
        <p className="text-sm text-ink-500">
          {vikunjaStatus?.configured
            ? 'Connected. Edit credentials in .env and restart the backend.'
            : 'Not configured. Set VIKUNJA_API_URL and VIKUNJA_TOKEN in your .env file and restart the backend container.'}
        </p>
      </section>

      <section className="card p-5">
        <h2 className="text-base font-semibold mb-2">About</h2>
        <p className="text-sm text-ink-500">
          Self-hosted bookmark manager — React + Node + PostgreSQL. Accessible only via Tailscale.
        </p>
      </section>
    </div>
  );
}
