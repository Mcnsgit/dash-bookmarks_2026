// Backend entry-point. Boots the HTTP/WebSocket server.
import 'dotenv/config';
import http from 'http';
import { WebSocketServer } from 'ws';

import { buildApp } from './app.js';
import { pool } from './db.js';
import { redisInit } from './redis.js';
import { AUTH_ENABLED } from './auth.js';
import { initNoAuthUser } from './middleware/authMiddleware.js';

const PORT = parseInt(process.env.PORT || '4000', 10);
const app = buildApp();
const server = http.createServer(app);

// WebSocket
const wss = new WebSocketServer({ server, path: '/api/ws' });
const clients = new Set();
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});
export function broadcast(event, payload) {
  const msg = JSON.stringify({ event, payload, ts: Date.now() });
  for (const ws of clients) if (ws.readyState === 1) ws.send(msg);
}
global.__broadcast = broadcast;

// Boot
(async () => {
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
