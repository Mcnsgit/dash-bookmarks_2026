import { Router } from 'express';
import { q } from '../db.js';

const r = Router();

r.get('/', async (req, res, next) => {
  try {
    const { rows } = await q(
      `SELECT rl.*, b.favicon_url, b.og_image_url, b.domain
       FROM reading_list rl
       LEFT JOIN bookmarks b ON b.id = rl.bookmark_id
       WHERE rl.user_id = $1
       ORDER BY rl.is_read ASC, rl.priority ASC, rl.added_at DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

r.post('/', async (req, res, next) => {
  try {
    const { bookmark_id, url, title, priority } = req.body;
    if (!url && !bookmark_id) return res.status(400).json({ error: 'url or bookmark_id required' });
    const { rows } = await q(
      `INSERT INTO reading_list (user_id, bookmark_id, url, title, priority)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, bookmark_id || null, url || null, title || null, priority || 2]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

r.patch('/:id', async (req, res, next) => {
  try {
    const { is_read, priority } = req.body;
    const { rows } = await q(
      `UPDATE reading_list
       SET is_read = COALESCE($1, is_read),
           read_at = CASE WHEN $1 = true THEN now() ELSE read_at END,
           priority = COALESCE($2, priority)
       WHERE id = $3 AND user_id = $4 RETURNING *`,
      [is_read ?? null, priority ?? null, req.params.id, req.userId]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

r.delete('/:id', async (req, res, next) => {
  try {
    await q('DELETE FROM reading_list WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
