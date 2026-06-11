// Lightweight metadata fetcher (title, description, favicon, OG image).
import axios from 'axios';
import * as cheerio from 'cheerio';
import { getDomain } from '../utils/url.js';

const UA = 'Mozilla/5.0 (compatible; BookmarkBot/1.0)';

export async function fetchMetadata(url) {
  const result = {
    title: null,
    description: null,
    favicon_url: null,
    og_image_url: null,
    domain: getDomain(url),
  };

  try {
    const res = await axios.get(url, {
      timeout: 8000,
      maxRedirects: 5,
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*;q=0.8' },
      responseType: 'text',
      validateStatus: (s) => s < 500,
    });

    const $ = cheerio.load(res.data);

    result.title = ($('meta[property="og:title"]').attr('content') ||
                    $('meta[name="twitter:title"]').attr('content') ||
                    $('title').first().text() || '').trim() || null;

    result.description = ($('meta[property="og:description"]').attr('content') ||
                          $('meta[name="description"]').attr('content') ||
                          $('meta[name="twitter:description"]').attr('content') || '').trim() || null;

    const og = $('meta[property="og:image"]').attr('content') ||
               $('meta[name="twitter:image"]').attr('content');
    if (og) result.og_image_url = absolutize(url, og);

    let icon =
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href') ||
      $('link[rel="apple-touch-icon"]').attr('href');
    if (!icon) icon = '/favicon.ico';
    result.favicon_url = absolutize(url, icon);
  } catch (e) {
    // Network error or non-HTML response — fall back to defaults.
    if (!result.favicon_url && result.domain) {
      result.favicon_url = `https://www.google.com/s2/favicons?sz=64&domain=${result.domain}`;
    }
  }

  // Always provide a favicon (Google s2 fallback)
  if (!result.favicon_url && result.domain) {
    result.favicon_url = `https://www.google.com/s2/favicons?sz=64&domain=${result.domain}`;
  }
  return result;
}

function absolutize(base, href) {
  try { return new URL(href, base).toString(); } catch { return href; }
}
