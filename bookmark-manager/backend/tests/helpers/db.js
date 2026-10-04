// Shared test helpers — talks to a real Postgres test database.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL
  || 'postgres://bookmarkuser:bookmarkpass@localhost:5432/bookmarks_test';

let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: TEST_DATABASE_URL });
  }
  return pool;
}

export async function setupTestDb() {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.AUTH_ENABLED = 'true';
  process.env.JWT_SECRET = 'test-secret-key-do-not-use-in-prod';
  process.env.OIDC_ENABLED = 'false';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.SCREENSHOTS_DIR = path.join(process.cwd(), '.tmp-screenshots');

  const p = getPool();

  const sql = fs.readFileSync(
    path.join(__dirname, '..', '..', 'src', 'migrations', '001_init.sql'),
    'utf8'
  );

  await p.query('SELECT pg_advisory_lock(123456789)');
  try {
    await p.query(sql);
  } finally {
    await p.query('SELECT pg_advisory_unlock(123456789)');
  }
}

export async function resetTestDb() {
  const p = getPool();
  const res = await p.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename NOT IN ('spatial_ref_sys');
  `);

  // Safely quote table names to handle any SQL reserved keywords
  const tables = res.rows.map(r => `"${r.tablename}"`).join(', ');
  if (tables) {
    await p.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`);
  }
}

export async function teardownTestDb() {
  if (pool) await pool.end();
  try {
    const { pool: appPool } = await import('../../src/db.js');
    await appPool.end();
  } catch (_) { /* ignore */ }
  try {
    const { redis } = await import('../../src/redis.js');
    if (redis.isOpen) await redis.quit();
  } catch (_) { /* ignore */ }
}