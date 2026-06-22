// Shared test helpers — talks to a real Postgres test database.
// Run with: TEST_DATABASE_URL=postgres://... yarn test
// In CI a Postgres service container provides this URL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL
  || 'postgres://bookmarkuser:bookmarkpass@localhost:5432/bookmarks_test';

let pool;

export async function setupTestDb() {
  // Point the app to the test DB by env var BEFORE importing modules.
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.AUTH_ENABLED = 'true';
  process.env.JWT_SECRET = 'test-secret-key-do-not-use-in-prod';
  process.env.OIDC_ENABLED = 'false';
  process.env.REDIS_URL = 'redis://localhost:6379';     // optional; redis init is best-effort

  pool = new Pool({ connectionString: TEST_DATABASE_URL });

  // Run schema (idempotent thanks to IF NOT EXISTS).
  const sql = fs.readFileSync(
    path.join(__dirname, '..', '..', 'src', 'migrations', '001_init.sql'),
    'utf8'
  );
  await pool.query(sql);
}

export async function resetTestDb() {
  // TRUNCATE every data table; preserve schema.
  await pool.query(`
    TRUNCATE TABLE
      vikunja_tasks, import_history, notes, reading_list,
      session_bookmarks, tab_sessions,
      bookmark_tags, bookmarks, tags, folders,
      personal_access_tokens, users
    RESTART IDENTITY CASCADE;
  `);
}

export async function teardownTestDb() {
  if (pool) await pool.end();
  // Close the app's pool too (created lazily on first import of db.js).
  try {
    const { pool: appPool } = await import('../../src/db.js');
    await appPool.end();
  } catch (_) { /* ignore */ }
  // Close redis if it ever connected.
  try {
    const { redis } = await import('../../src/redis.js');
    if (redis.isOpen) await redis.quit();
  } catch (_) { /* ignore */ }
}

export function getPool() { return pool; }
