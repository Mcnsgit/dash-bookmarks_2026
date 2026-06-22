// Express app factory \u2014 returns a configured Express app WITHOUT starting the
// HTTP listener. Used by both src/server.js (production boot) and tests.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { AUTH_ENABLED } from './auth.js';
import { authenticate } from './middleware/authMiddleware.js';

import authRouter        from './routes/auth.js';
import bookmarksRouter   from './routes/bookmarks.js';
import foldersRouter     from './routes/folders.js';
import tagsRouter        from './routes/tags.js';
import sessionsRouter    from './routes/sessions.js';
import readingListRouter from './routes/readingList.js';
import notesRouter       from './routes/notes.js';
import importRouter      from './routes/import.js';
import searchRouter      from './routes/search.js';
import vikunjaRouter     from './routes/vikunja.js';
import statsRouter       from './routes/stats.js';

export function buildApp({ logger = true } = {}) {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '20mb' }));
  if (logger) app.use(morgan('tiny'));

  // Public endpoints
  app.get('/api/health', (_req, res) => res.json({ ok: true, auth_enabled: AUTH_ENABLED, ts: Date.now() }));
  app.use('/api/auth', authRouter);

  // Authenticated endpoints
  app.use('/api', authenticate);

  app.use('/api/bookmarks',    bookmarksRouter);
  app.use('/api/folders',      foldersRouter);
  app.use('/api/tags',         tagsRouter);
  app.use('/api/sessions',     sessionsRouter);
  app.use('/api/reading-list', readingListRouter);
  app.use('/api/notes',        notesRouter);
  app.use('/api/import',       importRouter);
  app.use('/api/search',       searchRouter);
  app.use('/api/vikunja',      vikunjaRouter);
  app.use('/api/stats',        statsRouter);

  app.use((err, _req, res, _next) => {
    console.error('[err]', err);
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
  });

  return app;
}
