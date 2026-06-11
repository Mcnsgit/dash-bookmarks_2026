import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => console.error('[pg] pool error', err));

export const q = (text, params) => pool.query(text, params);

/**
 * Ensure the schema is loaded (idempotent) and seed a default single user.
 * Returns the default user's id.
 */
export async function ensureDefaultUser() {
  const email = process.env.DEFAULT_USER_EMAIL || 'me@local';
  const { rows } = await q(
    `INSERT INTO users (email, display_name)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id`,
    [email, 'Me']
  );
  return rows[0].id;
}
