import { Router } from 'express';
import { q } from '../db.js';
import { z } from 'zod';

const r = Router();

const FolderInput = z.object({
  name: z.string().min(1),
  parent_id: z.string().uuid().nullable().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  position: z.number().int().optional(),
});

r.get('/', async (req, res, next) => {
  try {
    const { rows } = await q(
      `SELECT f.*,
              (SELECT COUNT(*) FROM bookmarks b WHERE b.folder_id = f.id AND b.is_archived = false) AS bookmark_count
       FROM folders f WHERE f.user_id = $1
       ORDER BY f.position ASC, f.name ASC`,
      [req.userId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

r.post('/', async (req, res, next) => {
  try {
    const b = FolderInput.parse(req.body);
    const { rows } = await q(
      `INSERT INTO folders (user_id, name, parent_id, color, icon, position)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.userId, b.name, b.parent_id || null, b.color || '#6366f1', b.icon || 'folder', b.position || 0]
    );
    global.__broadcast?.('folder.created', rows[0]);
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

r.patch('/:id', async (req, res, next) => {
  try {
    const b = FolderInput.partial().parse(req.body);
    const fields = [], params = [];
    const set = (c, v) => { params.push(v); fields.push(`${c} = $${params.length}`); };
    if (b.name !== undefined) set('name', b.name);
    if (b.parent_id !== undefined) set('parent_id', b.parent_id);
    if (b.color !== undefined) set('color', b.color);
    if (b.icon !== undefined) set('icon', b.icon);
    if (b.position !== undefined) set('position', b.position);
    if (!fields.length) return res.json({ ok: true });
    params.push(req.params.id, req.userId);
    const { rows } = await q(
      `UPDATE folders SET ${fields.join(', ')}
       WHERE id = $${params.length - 1} AND user_id = $${params.length} RETURNING *`,
      params
    );
    global.__broadcast?.('folder.updated', rows[0]);
    res.json(rows[0]);
  } catch (e) { next(e); }
});

r.delete('/:id', async (req, res, next) => {
  try {
    await q('DELETE FROM folders WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    global.__broadcast?.('folder.deleted', { id: req.params.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
