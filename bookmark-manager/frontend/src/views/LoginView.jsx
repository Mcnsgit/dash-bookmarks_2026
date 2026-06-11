import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Bookmark, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../auth.js';

export default function LoginView() {
  const { user, status, signup, login } = useAuth();
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const isSetup = !!status?.needs_setup;
  const [form, setForm] = useState({ email: '', password: '', display_name: '' });

  if (user) return <Navigate to="/" replace />;
  if (status && !status.auth_enabled) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isSetup) await signup(form);
      else         await login({ email: form.email, password: form.password });
      toast.success(isSetup ? 'Welcome! Account created.' : 'Logged in');
      nav('/');
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-ink-50 to-brand-50 dark:from-ink-900 dark:to-ink-800 p-6">
      <form onSubmit={submit} className="card w-[min(420px,94vw)] p-7">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 grid place-items-center text-white shadow-elev">
            <Bookmark className="w-6 h-6" />
          </div>
          <div>
            <div className="text-lg font-semibold leading-none">Bookmark OS</div>
            <div className="text-xs text-ink-500">{isSetup ? 'Create your account' : 'Sign in'}</div>
          </div>
        </div>

        {isSetup && (
          <div className="mb-4 text-xs rounded-lg p-3 bg-brand-50 dark:bg-ink-800 text-brand-700 dark:text-brand-300">
            First-run setup: choose the credentials you’ll use to access this server.
          </div>
        )}

        <div className="flex flex-col gap-3">
          {isSetup && (
            <label className="text-xs text-ink-500">Display name (optional)
              <input className="input mt-1" autoFocus value={form.display_name}
                     onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </label>
          )}
          <label className="text-xs text-ink-500">Email
            <input type="email" required className="input mt-1" autoComplete="username"
                   autoFocus={!isSetup} value={form.email}
                   onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="text-xs text-ink-500">Password {isSetup && <span className="text-ink-400">(min 8 characters)</span>}
            <input type="password" required minLength={isSetup ? 8 : 1}
                   className="input mt-1" autoComplete={isSetup ? 'new-password' : 'current-password'}
                   value={form.password}
                   onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
        </div>

        <button type="submit" className="btn-primary w-full mt-5 justify-center" disabled={busy}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSetup ? 'Create account & sign in' : 'Sign in'}
        </button>

        <p className="text-xs text-ink-400 mt-5 text-center">
          Behind your Tailscale tunnel. No data leaves your server.
        </p>
      </form>
    </div>
  );
}
