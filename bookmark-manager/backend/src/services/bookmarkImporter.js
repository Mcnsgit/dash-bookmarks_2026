// Parses Netscape HTML and JSON bookmark exports.
import * as cheerio from 'cheerio';
import { normalizeUrl, getDomain } from '../utils/url.js';

/**
 * Detects format and routes to the right parser.
 * Returns an array of { url, title, folder, tags, created_at, description }
 */
export function parseBookmarks(raw, filename = '') {
  const text = raw.toString('utf8');
  if (/^\s*[\[{]/.test(text)) {
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json)) return parseGenericJson(json);
      if (json && json.roots && (json.roots.bookmark_bar || json.roots.other)) return parseChromeJson(json);
      return parseGenericJson([].concat(json));
    } catch { /* fall through to HTML */ }
  }
  return parseNetscapeHtml(text);
}

// --------- Netscape HTML --------------------------------------------------
export function parseNetscapeHtml(html) {
  const $ = cheerio.load(html);
  const out = [];

  // Walk DL > DT structure preserving folder hierarchy in <H3>
  const walk = (node, folderPath) => {
    $(node).children('dt').each((_, dt) => {
      const h3 = $(dt).children('h3').first();
      if (h3.length) {
        const next = $(dt).children('dl').first();
        const newPath = [...folderPath, h3.text().trim()];
        if (next.length) walk(next, newPath);
      }
      const a = $(dt).children('a').first();
      if (a.length) {
        const url = a.attr('href');
        if (!url || !/^https?:/i.test(url)) return;
        const title = a.text().trim() || url;
        const addDateAttr = a.attr('add_date');
        let created_at = null;
        if (addDateAttr && /^\d+$/.test(addDateAttr)) {
          created_at = new Date(parseInt(addDateAttr, 10) * 1000).toISOString();
        }
        const tagsAttr = a.attr('tags') || '';
        const tags = tagsAttr.split(',').map((t) => t.trim()).filter(Boolean);
        out.push({
          url,
          title,
          folder: folderPath.join(' > ') || null,
          tags,
          created_at,
          description: null,
        });
      }
    });
  };

  $('dl').first().each((_, dl) => walk(dl, []));
  if (!out.length) {
    // fallback: flat anchors
    $('a[href^="http"]').each((_, a) => {
      out.push({
        url: $(a).attr('href'),
        title: $(a).text().trim() || $(a).attr('href'),
        folder: null,
        tags: [],
        created_at: null,
        description: null,
      });
    });
  }
  return out;
}

// --------- Chrome native JSON --------------------------------------------
export function parseChromeJson(json) {
  const out = [];
  const walk = (node, folderPath) => {
    if (!node) return;
    if (Array.isArray(node.children)) {
      const newPath = node.name ? [...folderPath, node.name] : folderPath;
      node.children.forEach((c) => walk(c, newPath));
    } else if (node.type === 'url' && node.url) {
      out.push({
        url: node.url,
        title: node.name || node.url,
        folder: folderPath.length ? folderPath.join(' > ') : null,
        tags: [],
        created_at: node.date_added ? new Date(parseInt(node.date_added, 10) / 1000).toISOString() : null,
        description: null,
      });
    }
  };
  Object.values(json.roots || {}).forEach((r) => walk(r, []));
  return out;
}

// --------- Generic JSON array --------------------------------------------
export function parseGenericJson(arr) {
  return arr
    .filter((b) => b && (b.url || b.href))
    .map((b) => ({
      url: b.url || b.href,
      title: b.title || b.name || b.url,
      folder: b.folder || (Array.isArray(b.folders) ? b.folders.join(' > ') : null),
      tags: Array.isArray(b.tags) ? b.tags : (b.tag ? [b.tag] : []),
      created_at: b.created_at || b.added || null,
      description: b.description || null,
    }));
}

/**
 * Build a high-level analysis report for a parsed bookmark list.
 */
export function analyzeImport(list) {
  const folders = new Map();
  const tags = new Map();
  const domains = new Map();
  let oldest = null, newest = null;
  let invalid = 0;

  for (const b of list) {
    if (!b.url) { invalid++; continue; }
    const dom = getDomain(b.url);
    domains.set(dom, (domains.get(dom) || 0) + 1);
    if (b.folder) folders.set(b.folder, (folders.get(b.folder) || 0) + 1);
    (b.tags || []).forEach((t) => tags.set(t, (tags.get(t) || 0) + 1));
    if (b.created_at) {
      const d = new Date(b.created_at);
      if (!isNaN(d.getTime())) {
        if (!oldest || d < oldest) oldest = d;
        if (!newest || d > newest) newest = d;
      }
    }
  }

  const topDomains = [...domains.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
      .map(([domain, count]) => ({ domain, count }));

  return {
    total: list.length,
    invalid,
    folders: [...folders.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    tags:    [...tags.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    domains: topDomains,
    oldest: oldest ? oldest.toISOString() : null,
    newest: newest ? newest.toISOString() : null,
  };
}
