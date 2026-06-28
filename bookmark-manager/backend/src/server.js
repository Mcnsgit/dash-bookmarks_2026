// Backend entry-point.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import http from 'http';
import { WebSocketServer } from 'ws';

import { pool } from './db.js';
import { redisInit } from './redis.js';
import { AUTH_ENABLED } from './auth.js';
import { authenticate, initNoAuthUser } from './middleware/authMiddleware.js';

import authRouter from './routes/auth.js';
import bookmarksRouter from './routes/bookmarks.js';
import foldersRouter from './routes/folders.js';
import tagsRouter from './routes/tags.js';
import sessionsRouter from './routes/sessions.js';
import readingListRouter from './routes/readingList.js';
import notesRouter from './routes/notes.js';
import importRouter from './routes/import.js';
import searchRouter from './routes/search.js';
import vikunjaRouter from './routes/vikunja.js';
import statsRouter from './routes/stats.js';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '20mb' }));
app.use(morgan('tiny'));

// Public endpoints (no auth) ------------------------------------------------
app.get('/api/health', (_req, res) => res.json({ ok: true, auth_enabled: AUTH_ENABLED, ts: Date.now() }));
app.use('/api/auth', authRouter);

// Authenticated endpoints ---------------------------------------------------
app.use('/api', authenticate);

app.use('/api/bookmarks', bookmarksRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/reading-list', readingListRouter);
app.use('/api/notes', notesRouter);
app.use('/api/import', importRouter);
app.use('/api/search', searchRouter);
app.use('/api/vikunja', vikunjaRouter);
app.use('/api/stats', statsRouter);

app.use((err, _req, res, _next) => {
  console.error('[err]', err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// HTTP + WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/api/ws' });
const clients = new Set();
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});
export function broadcast(event, payload) {
  const msg = JSON.stringify({ event, payload, ts: Date.now() });
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}
global.__broadcast = broadcast;

// Boot
(async () => {
  // Wait for postgres to accept connections (basic backoff).
  for (let i = 0; i < 30; i++) {
    try { await pool.query('SELECT 1'); break; }
    catch { await new Promise((r) => setTimeout(r, 1000)); }
  }
  await initNoAuthUser();
  console.log('[boot] AUTH_ENABLED =', AUTH_ENABLED);
  await redisInit();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[boot] backend listening on :${PORT}`);
  });
})().catch((e) => {
  console.error('[boot] fatal', e);
  process.exit(1);
});
