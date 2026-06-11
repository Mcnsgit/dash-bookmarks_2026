import { Router } from 'express';
import * as V from '../services/vikunjaClient.js';
import { q } from '../db.js';

const r = Router();

r.get('/status', (_req, res) => res.json({ configured: V.isConfigured() }));

r.get('/projects', async (_req, res, next) => {
  try { res.json(await V.listProjects()); } catch (e) { next(e); }
});

r.get('/tasks', async (req, res, next) => {
  try {
    const { filter = 'open' } = req.query;
    const tasks = await V.getTasks(filter);
    res.json(tasks);
  } catch (e) { next(e); }
});

r.post('/tasks', async (req, res, next) => {
  try {
    const { projectId, title, description, bookmarkId } = req.body;
    const task = await V.createTask({ projectId, title, description });
    if (task?.id) {
      await q(
        `INSERT INTO vikunja_tasks (user_id, bookmark_id, vikunja_id, project_id, title)
         VALUES ($1,$2,$3,$4,$5)`,
        [req.userId, bookmarkId || null, task.id, projectId, title]
      );
    }
    res.status(201).json(task);
  } catch (e) { next(e); }
});

r.post('/tasks/:id/done', async (req, res, next) => {
  try {
    const { done = true } = req.body || {};
    const t = await V.markDone(parseInt(req.params.id, 10), done);
    await q('UPDATE vikunja_tasks SET done = $1, synced_at = now() WHERE vikunja_id = $2',
      [done, parseInt(req.params.id, 10)]);
    res.json(t);
  } catch (e) { next(e); }
});

export default r;
