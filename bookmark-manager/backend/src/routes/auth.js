import { Router } from 'express';
import { z } from 'zod';
import { q } from '../db.js';
import {
  AUTH_ENABLED, hashPassword, verifyPassword, issueJwt,
  generatePatRaw, hashToken,
} from '../auth.js';
import { authenticate } from '../middleware/authMiddleware.js';
import * as oidc from '../oidc.js';

const r = Router();

const Email    = z.string().email().toLowerCase();
const Password = z.string().min(8, 'Password must be at least 8 characters');

// Status: tells the frontend whether auth is on and whether setup is needed.
r.get('/status', async (_req, res, next) => {
  try {
    const { rows } = await q(`SELECT 1 FROM users WHERE password_hash IS NOT NULL OR oidc_sub IS NOT NULL LIMIT 1`);
    res.json({
      auth_enabled:  AUTH_ENABLED,
      needs_setup:   AUTH_ENABLED && rows.length === 0,
      oidc_enabled:  oidc.oidcEnabled(),
      oidc_provider: oidc.oidcProviderName(),
    });
  } catch (e) { next(e); }
});

// First-run signup. Allowed ONLY when no user with a password exists yet.
r.post('/signup', async (req, res, next) => {
  try {
    if (!AUTH_ENABLED) return res.status(400).json({ error: 'Auth is disabled' });
    const existing = await q(`SELECT 1 FROM users WHERE password_hash IS NOT NULL OR oidc_sub IS NOT NULL LIMIT 1`);
    if (existing.rows.length) return res.status(409).json({ error: 'Already configured. Please log in.' });

    const { email, password, display_name } = z.object({
      email: Email, password: Password, display_name: z.string().min(1).max(80).optional(),
    }).parse(req.body);

    const password_hash = await hashPassword(password);

    // Re-use a default user row if one was created in no-auth mode, otherwise insert.
    const upd = await q(
      `UPDATE users SET email = $1, display_name = COALESCE($2, display_name), password_hash = $3
       WHERE password_hash IS NULL RETURNING *`,
      [email, display_name || null, password_hash]
    );
    let user;
    if (upd.rows[0]) user = upd.rows[0];
    else {
      const ins = await q(
        `INSERT INTO users (email, display_name, password_hash) VALUES ($1, $2, $3) RETURNING *`,
        [email, display_name || 'Me', password_hash]
      );
      user = ins.rows[0];
    }
    await q('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
    const token = issueJwt(user);
    res.status(201).json({ user: sanitize(user), token });
  } catch (e) { next(e); }
});

r.post('/login', async (req, res, next) => {
  try {
    if (!AUTH_ENABLED) return res.status(400).json({ error: 'Auth is disabled' });
    const { email, password } = z.object({ email: Email, password: z.string().min(1) }).parse(req.body);
    const { rows } = await q(`SELECT * FROM users WHERE email = $1 LIMIT 1`, [email]);
    const user = rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      // Constant time-ish delay to slow brute force a bit.
      await new Promise((r) => setTimeout(r, 300));
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    await q('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
    const token = issueJwt(user);
    res.json({ user: sanitize(user), token });
  } catch (e) { next(e); }
});

r.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await q('SELECT * FROM users WHERE id = $1', [req.userId]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: sanitize(rows[0]), auth_method: req.authMethod || 'noauth', auth_enabled: AUTH_ENABLED });
  } catch (e) { next(e); }
});

r.patch('/me', authenticate, async (req, res, next) => {
  try {
    const { display_name, email, current_password, new_password } = req.body || {};
    const fields = [], params = [];
    if (display_name !== undefined) { params.push(display_name); fields.push(`display_name = $${params.length}`); }
    if (email !== undefined) {
      const e2 = Email.parse(email); params.push(e2); fields.push(`email = $${params.length}`);
    }
    if (new_password) {
      if (AUTH_ENABLED) {
        const u = (await q('SELECT password_hash FROM users WHERE id = $1', [req.userId])).rows[0];
        if (!u || !(await verifyPassword(current_password || '', u.password_hash))) {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }
      }
      const hash = await hashPassword(Password.parse(new_password));
      params.push(hash); fields.push(`password_hash = $${params.length}`);
    }
    if (!fields.length) return res.json({ ok: true });
    params.push(req.userId);
    const { rows } = await q(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`, params
    );
    res.json({ user: sanitize(rows[0]) });
  } catch (e) { next(e); }
});

// --- Personal Access Tokens --------------------------------------------
r.get('/tokens', authenticate, async (req, res, next) => {
  try {
    const { rows } = await q(
      `SELECT id, name, token_prefix, last_used_at, created_at, revoked_at
       FROM personal_access_tokens WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

r.post('/tokens', authenticate, async (req, res, next) => {
  try {
    const name = String(req.body?.name || 'Personal token').trim().slice(0, 80) || 'Personal token';
    const raw = generatePatRaw();
    const token_hash = hashToken(raw);
    const token_prefix = raw.slice(0, 12);
    const { rows } = await q(
      `INSERT INTO personal_access_tokens (user_id, name, token_hash, token_prefix)
       VALUES ($1, $2, $3, $4) RETURNING id, name, token_prefix, created_at`,
      [req.userId, name, token_hash, token_prefix]
    );
    // Return raw token ONCE — never again.
    res.status(201).json({ ...rows[0], token: raw });
  } catch (e) { next(e); }
});

r.delete('/tokens/:id', authenticate, async (req, res, next) => {
  try {
    await q(
      `UPDATE personal_access_tokens SET revoked_at = now()
       WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [req.params.id, req.userId]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

function sanitize(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u; // strip
  return rest;
}

// ===== OIDC / SSO =========================================================

// Kick off the OIDC flow. Returns 302 to the provider's authorize URL.
r.get('/oidc/login', async (_req, res, next) => {
  try {
    if (!AUTH_ENABLED)     return res.status(400).send('Auth disabled');
    if (!oidc.oidcEnabled()) return res.status(400).send('OIDC not configured');
    const url = await oidc.buildAuthorizationUrl();
    res.redirect(url);
  } catch (e) { next(e); }
});

// OIDC callback. Provider redirects here with ?code=...&state=...
// We validate, find-or-create the single user, mint a JWT, then redirect to the
// frontend with the token in the URL fragment (so it never hits server logs).
r.get('/oidc/callback', async (req, res, next) => {
  const fail = (msg) => res.redirect(`/login?error=${encodeURIComponent(msg)}`);
  try {
    if (!AUTH_ENABLED || !oidc.oidcEnabled()) return fail('OIDC not configured');
    if (req.query.error) return fail(String(req.query.error_description || req.query.error));

    const claims = await oidc.exchangeCallback(req.query);
    if (!claims.email) return fail('Provider did not return an email');
    if (!oidc.isEmailAllowed(claims.email)) return fail('Email is not in the allow-list');

    // Single-user model: find by oidc_sub OR by email. If a user already exists
    // with a different identity, we re-key it to this OIDC identity (single-user
    // can only ever be one row).
    let user;
    const existingBySub = await q(
      `SELECT * FROM users WHERE oidc_sub = $1 AND oidc_issuer = $2 LIMIT 1`,
      [claims.sub, claims.issuer]
    );
    if (existingBySub.rows[0]) {
      user = existingBySub.rows[0];
    } else {
      const anyUser = await q(`SELECT * FROM users LIMIT 1`);
      if (anyUser.rows[0]) {
        // Existing user (perhaps created via no-auth or password signup). Only
        // attach OIDC if the emails match \u2014 prevents account takeover.
        if (anyUser.rows[0].email.toLowerCase() !== claims.email) {
          return fail(`Existing account email (${anyUser.rows[0].email}) doesn't match SSO email (${claims.email})`);
        }
        const upd = await q(
          `UPDATE users SET oidc_sub = $1, oidc_issuer = $2,
                            display_name = COALESCE(display_name, $3),
                            last_login_at = now()
           WHERE id = $4 RETURNING *`,
          [claims.sub, claims.issuer, claims.name, anyUser.rows[0].id]
        );
        user = upd.rows[0];
      } else {
        // Fresh install \u2014 create the (first and only) user from this SSO identity.
        const ins = await q(
          `INSERT INTO users (email, display_name, oidc_sub, oidc_issuer, last_login_at)
           VALUES ($1, $2, $3, $4, now()) RETURNING *`,
          [claims.email, claims.name || 'Me', claims.sub, claims.issuer]
        );
        user = ins.rows[0];
      }
    }
    await q('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
    const token = issueJwt(user);
    // Token in URL fragment is invisible to the server and to proxies.
    res.redirect(`/oidc/callback#token=${encodeURIComponent(token)}`);
  } catch (e) {
    console.error('[oidc] callback error', e);
    return fail(e.message || 'OIDC failure');
  }
});

export default r;
