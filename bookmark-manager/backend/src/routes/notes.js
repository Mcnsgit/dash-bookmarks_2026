import { Router } from 'express';
import { q } from '../db.js';

const r = Router();

r.get('/', async (req, res, next) => {
  try {
    const { folder_id } = req.query;
    const params = [req.userId];
    let extra = '';
    if (folder_id) { params.push(folder_id); extra = `AND folder_id = $${params.length}`; }
    const { rows } = await q(
      `SELECT * FROM notes WHERE user_id = $1 ${extra} ORDER BY updated_at DESC`, params
    );
    res.json(rows);
  } catch (e) { next(e); }
});

r.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await q('SELECT * FROM notes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

r.post('/', async (req, res, next) => {
  try {
    const { title, content, folder_id } = req.body;
    const { rows } = await q(
      `INSERT INTO notes (user_id, title, content, folder_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.userId, title || 'Untitled', content || '', folder_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

r.patch('/:id', async (req, res, next) => {
  try {
    const { title, content, folder_id } = req.body;
    const { rows } = await q(
      `UPDATE notes
       SET title = COALESCE($1, title), content = COALESCE($2, content),
           folder_id = COALESCE($3, folder_id), updated_at = now()
       WHERE id = $4 AND user_id = $5 RETURNING *`,
      [title ?? null, content ?? null, folder_id ?? null, req.params.id, req.userId]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

r.delete('/:id', async (req, res, next) => {
  try {
    await q('DELETE FROM notes WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
