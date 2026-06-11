import { Router } from 'express';
import { q } from '../db.js';

const r = Router();

r.get('/', async (req, res, next) => {
  try {
    const [b, f, t, rl, s] = await Promise.all([
      q(`SELECT
          COUNT(*) FILTER (WHERE is_archived = false) AS bookmarks,
          COUNT(*) FILTER (WHERE is_archived = true)  AS archived,
          COUNT(*) FILTER (WHERE is_pinned   = true)  AS pinned
         FROM bookmarks WHERE user_id = $1`, [req.userId]),
      q('SELECT COUNT(*)::int AS n FROM folders     WHERE user_id = $1', [req.userId]),
      q('SELECT COUNT(*)::int AS n FROM tags        WHERE user_id = $1', [req.userId]),
      q(`SELECT COUNT(*) FILTER (WHERE is_read = false) AS unread,
                COUNT(*) FILTER (WHERE is_read = true)  AS read
         FROM reading_list WHERE user_id = $1`, [req.userId]),
      q('SELECT COUNT(*)::int AS n FROM tab_sessions WHERE user_id = $1', [req.userId]),
    ]);
    const topDomains = (await q(
      `SELECT domain, COUNT(*)::int AS n FROM bookmarks
       WHERE user_id = $1 AND domain IS NOT NULL AND is_archived = false
       GROUP BY domain ORDER BY n DESC LIMIT 10`, [req.userId])).rows;
    res.json({
      bookmarks: parseInt(b.rows[0].bookmarks, 10),
      archived:  parseInt(b.rows[0].archived,  10),
      pinned:    parseInt(b.rows[0].pinned,    10),
      folders:   f.rows[0].n,
      tags:      t.rows[0].n,
      reading:   { unread: parseInt(rl.rows[0].unread, 10), read: parseInt(rl.rows[0].read, 10) },
      sessions:  s.rows[0].n,
      topDomains,
    });
  } catch (e) { next(e); }
});

export default r;
