import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.js';

export default function RequireAuth({ children }) {
  const { ready, user, status, init } = useAuth();
  const loc = useLocation();
  useEffect(() => { if (!ready) init(); }, [ready, init]);
  if (!ready) {
    return <div className="min-h-screen grid place-items-center text-sm text-ink-500">Loading…</div>;
  }
  if (!status?.auth_enabled) return children;     // no-auth mode
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}
