import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setToken } from '../api.js';
import { useAuth } from '../auth.js';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function OidcCallbackView() {
  const nav = useNavigate();
  const init = useAuth((s) => s.init);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      const hash = window.location.hash || '';
      const m = hash.match(/token=([^&]+)/);
      if (!m) { setErr('No token returned from the SSO provider.'); return; }
      try {
        setToken(decodeURIComponent(m[1]));
        // Clear the fragment from history so the token doesn't linger in the URL bar.
        window.history.replaceState({}, '', '/');
        await init();
        nav('/', { replace: true });
      } catch (e) {
        setErr(e.message || 'Failed to complete sign-in.');
      }
    })();
  }, [init, nav]);

  return (
    <div className="min-h-screen grid place-items-center text-sm">
      {err ? (
        <div className="card p-6 max-w-md text-center">
          <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <div className="font-semibold mb-1">Sign-in failed</div>
          <div className="text-ink-500 mb-4">{err}</div>
          <a className="btn-primary inline-flex" href="/login">Back to sign in</a>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-ink-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Completing sign-in…
        </div>
      )}
    </div>
  );
}
