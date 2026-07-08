import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.js';

export default function RequireAuth({ children }) {
  const { user, status } = useAuth();
  const loc = useLocation();
  if (!status?.auth_enabled) return children;     // no-auth mode
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}
