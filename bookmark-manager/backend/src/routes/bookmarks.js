import { Router } from 'express';
import { q } from '../db.js';
import { z } from 'zod';
import { normalizeUrl, getDomain, isValidUrl } from '../utils/url.js';
import { fetchMetadata } from '../services/metadataExtractor.js';
import { captureScreenshot } from '../services/screenshotClient.js';

const r = Router();

const BookmarkInput = z.object({
  url: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  folder_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
  is_pinned: z.boolean().optional(),
});

// List with filters: folder_id, tag, q (search), domain, archived, pinned, limit, offset, sort
r.get('/', async (req, res, next) => {
  try {
    const { folder_id, tag, q: query, domain, archived, pinned, sort = 'recent', limit = 200, offset = 0 } = req.query;
    const where = ['b.user_id = $1'];
    const params = [req.userId];

    if (folder_id) { params.push(folder_id); where.push(`b.folder_id = $${params.length}`); }
    if (domain)    { params.push(domain);    where.push(`b.domain    = $${params.length}`); }
    if (archived === 'true')  where.push('b.is_archived = true');
    else if (archived !== 'all') where.push('b.is_archived = false');
    if (pinned === 'true') where.push('b.is_pinned = true');
    if (query) {
      params.push(query);
      where.push(`(b.search_vector @@ plainto_tsquery('simple', $${params.length}) OR b.title ILIKE '%' || $${params.length} || '%')`);
    }
    if (tag) {
      params.push(tag);
      where.push(`EXISTS (SELECT 1 FROM bookmark_tags bt JOIN tags t ON t.id = bt.tag_id
                          WHERE bt.bookmark_id = b.id AND t.name = $${params.length} AND t.user_id = b.user_id)`);
    }

    const orderBy =
      sort === 'oldest'      ? 'b.created_at ASC'
    : sort === 'title'       ? 'b.title ASC'
    : sort === 'domain'      ? 'b.domain ASC, b.title ASC'
    : sort === 'most_visited'? 'b.visit_count DESC, b.created_at DESC'
    :                          'b.is_pinned DESC, b.created_at DESC';

    params.push(parseInt(limit, 10), parseInt(offset, 10));
    const { rows } = await q(
      `SELECT b.*,
              COALESCE(
                (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
                 FROM bookmark_tags bt JOIN tags t ON t.id = bt.tag_id
                 WHERE bt.bookmark_id = b.id), '[]'::json) AS tags
       FROM bookmarks b
       WHERE ${where.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json(rows);
  } catch (e) { next(e); }
});

r.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await q(
      `SELECT b.*,
              COALESCE(
                (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
                 FROM bookmark_tags bt JOIN tags t ON t.id = bt.tag_id WHERE bt.bookmark_id = b.id),
                '[]'::json) AS tags
       FROM bookmarks b WHERE b.id = $1 AND b.user_id = $2`,
      [req.params.id, req.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

r.post('/', async (req, res, next) => {
  try {
    const body = BookmarkInput.parse(req.body);
    if (!isValidUrl(body.url)) return res.status(400).json({ error: 'Invalid URL' });

    const url = /^https?:\/\//i.test(body.url) ? body.url : 'https://' + body.url;
    const meta = await fetchMetadata(url);
    const title  = body.title?.trim() || meta.title || url;
    const desc   = body.description ?? meta.description ?? null;
    const domain = getDomain(url);
    const norm   = normalizeUrl(url);

    const { rows } = await q(
      `INSERT INTO bookmarks
         (user_id, folder_id, url, url_normalized, title, description,
          favicon_url, og_image_url, domain, is_pinned)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [req.userId, body.folder_id || null, url, norm, title, desc,
       meta.favicon_url, meta.og_image_url, domain, !!body.is_pinned]
    );
    const b = rows[0];

    if (body.tags?.length) await attachTags(req.userId, b.id, body.tags);

    // Async screenshot (don't block response)
    captureScreenshot(b.id, url).then(async (path) => {
      if (path) {
        await q('UPDATE bookmarks SET screenshot_path = $1 WHERE id = $2', [path, b.id]);
        global.__broadcast?.('bookmark.updated', { id: b.id, screenshot_path: path });
      }
    });

    global.__broadcast?.('bookmark.created', { id: b.id });
    res.status(201).json(await fetchOne(req.userId, b.id));
  } catch (e) { next(e); }
});

r.patch('/:id', async (req, res, next) => {
  try {
    const body = BookmarkInput.partial().parse(req.body);
    const fields = [];
    const params = [];
    const set = (col, val) => { params.push(val); fields.push(`${col} = $${params.length}`); };
    if (body.title !== undefined)       set('title', body.title);
    if (body.description !== undefined) set('description', body.description);
    if (body.folder_id !== undefined)   set('folder_id', body.folder_id);
    if (body.is_pinned !== undefined)   set('is_pinned', body.is_pinned);
    if (body.url !== undefined) {
      const url = /^https?:\/\//i.test(body.url) ? body.url : 'https://' + body.url;
      set('url', url); set('url_normalized', normalizeUrl(url)); set('domain', getDomain(url));
    }
    if (!fields.length && !body.tags) return res.json(await fetchOne(req.userId, req.params.id));

    if (fields.length) {
      params.push(req.params.id, req.userId);
      await q(
        `UPDATE bookmarks SET ${fields.join(', ')}
         WHERE id = $${params.length - 1} AND user_id = $${params.length}`,
        params
      );
    }
    if (body.tags) {
      await q('DELETE FROM bookmark_tags WHERE bookmark_id = $1', [req.params.id]);
      if (body.tags.length) await attachTags(req.userId, req.params.id, body.tags);
    }
    global.__broadcast?.('bookmark.updated', { id: req.params.id });
    res.json(await fetchOne(req.userId, req.params.id));
  } catch (e) { next(e); }
});

r.delete('/:id', async (req, res, next) => {
  try {
    await q('DELETE FROM bookmarks WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    global.__broadcast?.('bookmark.deleted', { id: req.params.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.post('/:id/archive', async (req, res, next) => {
  try {
    await q('UPDATE bookmarks SET is_archived = NOT is_archived WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.post('/:id/visit', async (req, res, next) => {
  try {
    await q(`UPDATE bookmarks SET visit_count = visit_count + 1, last_visited_at = now()
             WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.post('/:id/rescreenshot', async (req, res, next) => {
  try {
    const { rows } = await q('SELECT id, url FROM bookmarks WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const path = await captureScreenshot(rows[0].id, rows[0].url);
    if (path) await q('UPDATE bookmarks SET screenshot_path = $1 WHERE id = $2', [path, rows[0].id]);
    res.json({ ok: !!path, path });
  } catch (e) { next(e); }
});

async function attachTags(userId, bookmarkId, tagNames) {
  for (const raw of tagNames) {
    const name = String(raw).trim().toLowerCase();
    if (!name) continue;
    const { rows } = await q(
      `INSERT INTO tags (user_id, name) VALUES ($1, $2)
       ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [userId, name]
    );
    await q('INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [bookmarkId, rows[0].id]);
  }
}

async function fetchOne(userId, id) {
  const { rows } = await q(
    `SELECT b.*,
            COALESCE(
              (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
               FROM bookmark_tags bt JOIN tags t ON t.id = bt.tag_id WHERE bt.bookmark_id = b.id),
              '[]'::json) AS tags
     FROM bookmarks b WHERE b.id = $1 AND b.user_id = $2`,
    [id, userId]
  );
  return rows[0] || null;
}

export default r;
