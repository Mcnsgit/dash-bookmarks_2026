import { Router } from 'express';
import multer from 'multer';
import { q } from '../db.js';
import { parseBookmarks, analyzeImport } from '../services/bookmarkImporter.js';
import { analyzeDuplicates } from '../services/duplicateDetector.js';
import { normalizeUrl, getDomain } from '../utils/url.js';
import { captureScreenshot } from '../services/screenshotClient.js';
import { fetchMetadata } from '../services/metadataExtractor.js';

const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } });
const r = Router();

// Step 1 — upload & analyze (no commit yet). Returns parsed list + analysis + duplicate report.
r.post('/analyze', upload.single('file'), async (req, res, next) => {
  try {
    let raw = req.file?.buffer;
    if (!raw && req.body?.content) raw = Buffer.from(req.body.content);
    if (!raw) return res.status(400).json({ error: 'Missing file (multipart "file") or content body' });

    const list = parseBookmarks(raw, req.file?.originalname);
    const analysis = analyzeImport(list);

    const { rows } = await q('SELECT url_normalized FROM bookmarks WHERE user_id = $1', [req.userId]);
    const existing = new Set(rows.map((r) => r.url_normalized).filter(Boolean));
    const dup = analyzeDuplicates(list, existing);

    res.json({ list, analysis, duplicates: dup, filename: req.file?.originalname || null });
  } catch (e) { next(e); }
});

// Step 2 — commit. Body: { list, options: { skipDuplicates, fetchMetadata, captureScreenshots, defaultFolderId } }
r.post('/commit', async (req, res, next) => {
  try {
    const { list, options = {} } = req.body || {};
    if (!Array.isArray(list)) return res.status(400).json({ error: 'list[] required' });

    const skip = options.skipDuplicates !== false;
    const doMeta = options.fetchMetadata === true;
    const doShot = options.captureScreenshots === true;

    // Build folder cache ("path > like > this" -> id)
    const folderCache = new Map();
    async function ensureFolder(path) {
      if (!path) return options.defaultFolderId || null;
      if (folderCache.has(path)) return folderCache.get(path);
      const parts = path.split('>').map((s) => s.trim()).filter(Boolean);
      let parent = null;
      for (let i = 0; i < parts.length; i++) {
        const name = parts[i];
        const key = parts.slice(0, i + 1).join(' > ');
        if (folderCache.has(key)) { parent = folderCache.get(key); continue; }
        const existing = await q(
          `SELECT id FROM folders WHERE user_id = $1 AND name = $2
             AND ((parent_id IS NULL AND $3::uuid IS NULL) OR parent_id = $3)`,
          [req.userId, name, parent]
        );
        let id = existing.rows[0]?.id;
        if (!id) {
          const ins = await q(
            `INSERT INTO folders (user_id, name, parent_id) VALUES ($1, $2, $3) RETURNING id`,
            [req.userId, name, parent]
          );
          id = ins.rows[0].id;
        }
        folderCache.set(key, id);
        parent = id;
      }
      return parent;
    }

    async function ensureTag(name) {
      const n = String(name).trim().toLowerCase();
      if (!n) return null;
      const { rows } = await q(
        `INSERT INTO tags (user_id, name) VALUES ($1, $2)
         ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [req.userId, n]);
      return rows[0].id;
    }

    const existing = new Set(
      (await q('SELECT url_normalized FROM bookmarks WHERE user_id = $1', [req.userId]))
        .rows.map((r) => r.url_normalized).filter(Boolean)
    );

    let imported = 0, skipped = 0, duplicates = 0;
    const created = [];

    for (const b of list) {
      if (!b?.url) { skipped++; continue; }
      const url = /^https?:\/\//i.test(b.url) ? b.url : 'https://' + b.url;
      const norm = normalizeUrl(url);
      if (existing.has(norm)) { duplicates++; if (skip) { skipped++; continue; } }
      existing.add(norm);

      let title = b.title || url;
      let description = b.description || null;
      let favicon_url = null, og_image_url = null;
      if (doMeta) {
        const meta = await fetchMetadata(url);
        if (meta.title && !b.title) title = meta.title;
        description = description ?? meta.description;
        favicon_url = meta.favicon_url;
        og_image_url = meta.og_image_url;
      } else {
        const dom = getDomain(url);
        if (dom) favicon_url = `https://www.google.com/s2/favicons?sz=64&domain=${dom}`;
      }
      const folder_id = await ensureFolder(b.folder);
      const { rows } = await q(
        `INSERT INTO bookmarks
          (user_id, folder_id, url, url_normalized, title, description,
           favicon_url, og_image_url, domain, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, COALESCE($10::timestamptz, now()))
         RETURNING id`,
        [req.userId, folder_id, url, norm, title, description,
         favicon_url, og_image_url, getDomain(url), b.created_at || null]
      );
      const id = rows[0].id;
      created.push(id);
      if (Array.isArray(b.tags)) {
        for (const t of b.tags) {
          const tid = await ensureTag(t);
          if (tid) await q('INSERT INTO bookmark_tags VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, tid]);
        }
      }
      imported++;
      if (doShot) captureScreenshot(id, url).then((p) => {
        if (p) q('UPDATE bookmarks SET screenshot_path=$1 WHERE id=$2', [p, id]);
      });
    }

    const hist = await q(
      `INSERT INTO import_history
         (user_id, source, total_count, imported_count, skipped_count, duplicate_count, analysis)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.userId, options.source || 'upload', list.length, imported, skipped, duplicates,
       options.analysis || null]
    );
    global.__broadcast?.('import.completed', hist.rows[0]);
    res.json({ imported, skipped, duplicates, history: hist.rows[0] });
  } catch (e) { next(e); }
});

r.get('/history', async (req, res, next) => {
  try {
    const { rows } = await q(
      `SELECT * FROM import_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.userId]);
    res.json(rows);
  } catch (e) { next(e); }
});

export default r;
