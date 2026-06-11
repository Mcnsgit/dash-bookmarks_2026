import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, KeyRound, Copy, Check, Trash2, Loader2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api.js';
import { formatDistanceToNow } from 'date-fns';

export default function TokensManager({ authEnabled }) {
  const qc = useQueryClient();
  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ['tokens'],
    queryFn: () => api.get('/auth/tokens'),
    enabled: authEnabled,
  });
  const [name, setName] = useState('Browser extension');
  const [created, setCreated] = useState(null);   // { token, name } shown once
  const [copied, setCopied] = useState(false);

  const create = useMutation({
    mutationFn: () => api.post('/auth/tokens', { name }),
    onSuccess: (r) => { setCreated(r); setName('Browser extension'); qc.invalidateQueries({ queryKey: ['tokens'] }); },
    onError: (e) => toast.error(e.message || 'Failed'),
  });
  const revoke = useMutation({
    mutationFn: (id) => api.del(`/auth/tokens/${id}`),
    onSuccess: () => { toast.success('Token revoked'); qc.invalidateQueries({ queryKey: ['tokens'] }); },
  });

  if (!authEnabled) {
    return (
      <div className="text-sm text-ink-500 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-ink-800 border border-amber-200 dark:border-ink-700">
        <ShieldAlert className="w-4 h-4 mt-0.5 text-amber-500" />
        <div>
          Auth is disabled (<code className="font-mono">AUTH_ENABLED=false</code>). Personal access tokens require auth to be enabled.
        </div>
      </div>
    );
  }

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error('Could not copy'); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input className="input flex-1" placeholder="Token name (e.g. Browser extension)" value={name}
               onChange={(e) => setName(e.target.value)} />
        <button className="btn-primary" disabled={create.isPending || !name.trim()} onClick={() => create.mutate()}>
          {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          New token
        </button>
      </div>

      {created && (
        <div className="card p-4 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-ink-800">
          <div className="flex items-start gap-3">
            <KeyRound className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Token created — copy it now</div>
              <p className="text-xs text-ink-500 mt-1">
                You will not be able to see it again. Paste it into the extension or your script.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 font-mono text-xs break-all bg-white dark:bg-ink-900 rounded-md px-2 py-1.5 border border-ink-200 dark:border-ink-700">
                  {created.token}
                </code>
                <button className="btn-soft" onClick={() => copy(created.token)}>
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <button className="btn-ghost text-xs mt-3" onClick={() => setCreated(null)}>I&rsquo;ve saved it — dismiss</button>
            </div>
          </div>
        </div>
      )}

      <div className="card divide-y divide-ink-100 dark:divide-ink-700">
        {isLoading && <div className="p-4 text-sm text-ink-400">Loading…</div>}
        {!isLoading && tokens.length === 0 && (
          <div className="p-4 text-sm text-ink-400">No tokens yet — generate one above to use with the browser extension or scripts.</div>
        )}
        {tokens.map((t) => (
          <div key={t.id} className="px-4 py-3 flex items-center gap-3">
            <KeyRound className="w-4 h-4 text-ink-400" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{t.name}</span>
                {t.revoked_at && <span className="chip text-red-500">revoked</span>}
              </div>
              <div className="text-xs text-ink-400 font-mono">{t.token_prefix}… · created {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                {t.last_used_at && <> · last used {formatDistanceToNow(new Date(t.last_used_at), { addSuffix: true })}</>}
              </div>
            </div>
            {!t.revoked_at && (
              <button className="btn-ghost p-1 text-red-500" title="Revoke"
                      onClick={() => confirm('Revoke this token?') && revoke.mutate(t.id)}>
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
