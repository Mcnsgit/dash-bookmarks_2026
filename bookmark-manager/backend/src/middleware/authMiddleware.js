// Auth middleware. Mount on every /api route EXCEPT /api/auth/* and /api/health.
import { AUTH_ENABLED, isPat, lookupPat, verifyJwt } from '../auth.js';
import { ensureDefaultUser } from '../db.js';

let noAuthUserId = null;
export async function initNoAuthUser() {
  if (!AUTH_ENABLED) noAuthUserId = await ensureDefaultUser();
  return noAuthUserId;
}

export async function authenticate(req, res, next) {
  if (!AUTH_ENABLED) {
    req.userId = noAuthUserId;
    return next();
  }
  const auth = req.headers.authorization || '';
  if (!auth.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  const token = auth.slice(7).trim();
  try {
    if (isPat(token)) {
      const row = await lookupPat(token);
      if (!row) return res.status(401).json({ error: 'Invalid or revoked token' });
      req.userId = row.user_id;
      req.authMethod = 'pat';
      return next();
    }
    const decoded = verifyJwt(token);
    req.userId = decoded.sub;
    req.authMethod = 'jwt';
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
