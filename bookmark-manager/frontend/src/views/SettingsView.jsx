import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Trash2, FolderTree, KeyRound, User, ShieldCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api.js';
import { useAuth } from '../auth.js';
import TokensManager from '../components/TokensManager.jsx';

export default function SettingsView() {
  const qc = useQueryClient();
  const { user, status } = useAuth();
  const { data: folders = [] } = useQuery({ queryKey: ['folders'], queryFn: () => api.get('/folders') });
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const { data: vikunjaStatus } = useQuery({ queryKey: ['vikunja-status'], queryFn: () => api.get('/vikunja/status') });

  const createFolder = useMutation({
    mutationFn: () => api.post('/folders', { name, parent_id: parentId || null }),
    onSuccess: () => { setName(''); qc.invalidateQueries({ queryKey: ['folders'] }); toast.success('Folder created'); },
  });
  const delFolder = useMutation({
    mutationFn: (id) => api.del(`/folders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  });

  // Password change
  const [pw, setPw] = useState({ current_password: '', new_password: '' });
  const changePw = useMutation({
    mutationFn: () => api.patch('/auth/me', pw),
    onSuccess: () => { toast.success('Password updated'); setPw({ current_password: '', new_password: '' }); },
    onError: (e) => toast.error(e.message || 'Failed'),
  });

  // Display name
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const updateName = useMutation({
    mutationFn: () => api.patch('/auth/me', { display_name: displayName }),
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries({ queryKey: ['me'] }); },
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Settings</h1>
      <p className="text-sm text-ink-500 mb-6">Account, folders, integrations, and tokens.</p>

      {status?.auth_enabled && user && (
        <section className="card p-5 mb-6">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2"><User className="w-4 h-4" /> Account</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs text-ink-500">Email
              <input className="input mt-1" value={user.email} disabled />
            </label>
            <label className="text-xs text-ink-500">Display name
              <div className="flex gap-2 mt-1">
                <input className="input flex-1" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                <button className="btn-soft" onClick={() => updateName.mutate()} disabled={updateName.isPending}>Save</button>
              </div>
            </label>
          </div>
          <h3 className="text-sm font-medium mt-5 mb-2">Change password</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="password" autoComplete="current-password" placeholder="Current password" className="input"
                   value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} />
            <input type="password" autoComplete="new-password" placeholder="New password (min 8 chars)" className="input"
                   value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} />
          </div>
          <button className="btn-primary mt-3" disabled={!pw.new_password || changePw.isPending} onClick={() => changePw.mutate()}>
            {changePw.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Update password
          </button>
        </section>
      )}

      <section className="card p-5 mb-6">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2"><KeyRound className="w-4 h-4" /> Personal access tokens</h2>
        <p className="text-xs text-ink-500 mb-3">
          Generate a token for the browser extension or scripts. Tokens have the same access as your account.
        </p>
        <TokensManager authEnabled={!!status?.auth_enabled} />
      </section>

      <section className="card p-5 mb-6">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2"><FolderTree className="w-4 h-4" /> Folders</h2>
        <div className="flex gap-2 mb-4">
          <input className="input flex-1" placeholder="New folder name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="input w-40" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">No parent</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <button className="btn-primary" disabled={!name || createFolder.isPending} onClick={() => createFolder.mutate()}>
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
              <button className="btn-ghost p-1 text-red-500" onClick={() => confirm('Delete folder?') && delFolder.mutate(f.id)}>
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
        <h2 className="text-base font-semibold mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> About</h2>
        <p className="text-sm text-ink-500">
          Self-hosted bookmark manager — React + Node + PostgreSQL.
          Auth: <code className="text-xs">{status?.auth_enabled ? 'enabled' : 'disabled (AUTH_ENABLED=false)'}</code>.
          Accessible only via Tailscale.
        </p>
      </section>
    </div>
  );
}
