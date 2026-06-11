import { Router } from 'express';
import { q } from '../db.js';

const r = Router();

r.get('/', async (req, res, next) => {
  try {
    const { rows } = await q(
      `SELECT t.*,
              (SELECT COUNT(*) FROM bookmark_tags bt JOIN bookmarks b ON b.id = bt.bookmark_id
               WHERE bt.tag_id = t.id AND b.is_archived = false) AS bookmark_count
       FROM tags t WHERE t.user_id = $1 ORDER BY t.name ASC`,
      [req.userId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

r.post('/', async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const n = String(name || '').trim().toLowerCase();
    if (!n) return res.status(400).json({ error: 'Name required' });
    const { rows } = await q(
      `INSERT INTO tags (user_id, name, color) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, name) DO UPDATE SET color = EXCLUDED.color
       RETURNING *`,
      [req.userId, n, color || '#94a3b8']
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

r.patch('/:id', async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const { rows } = await q(
      `UPDATE tags SET name = COALESCE($1, name), color = COALESCE($2, color)
       WHERE id = $3 AND user_id = $4 RETURNING *`,
      [name ? String(name).toLowerCase() : null, color || null, req.params.id, req.userId]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

r.delete('/:id', async (req, res, next) => {
  try {
    await q('DELETE FROM tags WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
