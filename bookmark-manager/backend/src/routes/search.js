import { Router } from 'express';
import { q } from '../db.js';

const r = Router();

r.get('/', async (req, res, next) => {
  try {
    const { query, limit = 50 } = req.query;
    if (!query) return res.json([]);
    const { rows } = await q(
      `SELECT b.id, b.title, b.url, b.domain, b.favicon_url, b.og_image_url, b.screenshot_path,
              ts_rank(b.search_vector, plainto_tsquery('simple', $2)) AS rank
       FROM bookmarks b
       WHERE b.user_id = $1 AND b.is_archived = false
         AND (b.search_vector @@ plainto_tsquery('simple', $2)
              OR b.title    ILIKE '%' || $2 || '%'
              OR b.url      ILIKE '%' || $2 || '%'
              OR b.domain   ILIKE '%' || $2 || '%')
       ORDER BY rank DESC, b.created_at DESC
       LIMIT $3`,
      [req.userId, String(query), parseInt(limit, 10)]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

export default r;
