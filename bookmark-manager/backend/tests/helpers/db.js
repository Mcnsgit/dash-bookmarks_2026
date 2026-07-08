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
  process.env.SCREENSHOTS_DIR = path.join(process.cwd(), '.tmp-screenshots');

  pool = new Pool({ connectionString: TEST_DATABASE_URL });

  // Run schema (idempotent thanks to IF NOT EXISTS).
  const sql = fs.readFileSync(
    path.join(__dirname, '..', '..', 'src', 'migrations', '001_init.sql'),
    'utf8'
  );
  
  await pool.query('SELECT pg_advisory_lock(123456789)');
  try {
    await pool.query(sql);
  } finally {
    await pool.query('SELECT pg_advisory_unlock(123456789)');
  }
}

export async function resetTestDb() {
  // TRUNCATE every data table dynamically; preserve schema.
  const res = await pool.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename NOT IN ('spatial_ref_sys');
  `);
  
  const tables = res.rows.map(r => r.tablename).join(', ');
  if (tables) {
    await pool.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`);
  }
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
