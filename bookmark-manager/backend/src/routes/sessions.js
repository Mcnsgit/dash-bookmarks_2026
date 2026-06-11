import { Router } from 'express';
import { q } from '../db.js';

const r = Router();

r.get('/', async (req, res, next) => {
  try {
    const { rows } = await q(
      `SELECT s.*,
              (SELECT COUNT(*) FROM session_bookmarks sb WHERE sb.session_id = s.id) AS tab_count
       FROM tab_sessions s WHERE s.user_id = $1 ORDER BY s.created_at DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

r.get('/:id', async (req, res, next) => {
  try {
    const s = (await q('SELECT * FROM tab_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId])).rows[0];
    if (!s) return res.status(404).json({ error: 'Not found' });
    const tabs = (await q(
      'SELECT * FROM session_bookmarks WHERE session_id = $1 ORDER BY position ASC, id ASC',
      [req.params.id])).rows;
    res.json({ ...s, tabs });
  } catch (e) { next(e); }
});

r.post('/', async (req, res, next) => {
  try {
    const { name, description, tabs = [] } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const { rows } = await q(
      `INSERT INTO tab_sessions (user_id, name, description) VALUES ($1,$2,$3) RETURNING *`,
      [req.userId, name, description || null]
    );
    const session = rows[0];
    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i];
      if (!t?.url) continue;
      await q(
        `INSERT INTO session_bookmarks (session_id, url, title, favicon_url, position)
         VALUES ($1,$2,$3,$4,$5)`,
        [session.id, t.url, t.title || t.url, t.favicon_url || null, i]
      );
    }
    res.status(201).json(session);
  } catch (e) { next(e); }
});

r.patch('/:id', async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const { rows } = await q(
      `UPDATE tab_sessions SET name = COALESCE($1, name), description = COALESCE($2, description)
       WHERE id = $3 AND user_id = $4 RETURNING *`,
      [name || null, description || null, req.params.id, req.userId]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

r.delete('/:id', async (req, res, next) => {
  try {
    await q('DELETE FROM tab_sessions WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
