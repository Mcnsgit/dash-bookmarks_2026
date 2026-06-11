// Authentication helpers — JWT issuance/verification + PAT helpers.
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { q } from './db.js';

export const AUTH_ENABLED = process.env.AUTH_ENABLED !== 'false';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const JWT_TTL = process.env.JWT_TTL || '30d';

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 11);
}
export async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export function issueJwt(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_TTL });
}
export function verifyJwt(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ----- Personal access tokens (PATs) ------------------------------------
const PAT_PREFIX = 'bmpat_';
export function generatePatRaw() {
  return PAT_PREFIX + crypto.randomBytes(32).toString('hex');
}
export function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
export function isPat(token) { return typeof token === 'string' && token.startsWith(PAT_PREFIX); }

export async function lookupPat(raw) {
  const tokenHash = hashToken(raw);
  const { rows } = await q(
    `SELECT id, user_id FROM personal_access_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL LIMIT 1`,
    [tokenHash]
  );
  if (!rows[0]) return null;
  // Async update of last_used_at (don't await).
  q('UPDATE personal_access_tokens SET last_used_at = now() WHERE id = $1', [rows[0].id]).catch(() => {});
  return rows[0];
}
