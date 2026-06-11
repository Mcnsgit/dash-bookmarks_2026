// Detects duplicates within a bookmark list (and against existing DB rows).
import { normalizeUrl } from '../utils/url.js';

/** Levenshtein-style normalized title similarity (0..1). */
function titleSimilarity(a, b) {
  if (!a || !b) return 0;
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  if (x === y) return 1;
  const longer = x.length >= y.length ? x : y;
  const shorter = x.length >= y.length ? y : x;
  if (!longer.length) return 1;
  // Cheap Dice-coefficient on bigrams
  const bigrams = (s) => {
    const map = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      map.set(bg, (map.get(bg) || 0) + 1);
    }
    return map;
  };
  const A = bigrams(longer), B = bigrams(shorter);
  let inter = 0, total = 0;
  A.forEach((v) => total += v);
  B.forEach((v, k) => { total += v; if (A.has(k)) inter += Math.min(v, A.get(k)); });
  return total === 0 ? 0 : (2 * inter) / total;
}

/**
 * @param {Array<{url, title}>} list
 * @param {Set<string>} existingNormalizedUrls
 */
export function analyzeDuplicates(list, existingNormalizedUrls = new Set()) {
  const exact = [];        // duplicated url_normalized inside the list
  const againstDb = [];    // url_normalized already in db
  const titleNear = [];    // same normalized url? no. Same title >0.9 different url
  const seen = new Map();

  list.forEach((b, idx) => {
    const nu = normalizeUrl(b.url);
    if (existingNormalizedUrls.has(nu)) againstDb.push({ idx, url: b.url });

    if (seen.has(nu)) {
      exact.push({ idx, dupOf: seen.get(nu), url: b.url });
    } else {
      seen.set(nu, idx);
    }
  });

  // Title near-dupes (skip exact)
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (normalizeUrl(list[i].url) === normalizeUrl(list[j].url)) continue;
      const sim = titleSimilarity(list[i].title, list[j].title);
      if (sim >= 0.92) titleNear.push({ a: i, b: j, similarity: sim });
    }
  }

  return {
    duplicates_in_file: exact.length,
    duplicates_in_db:   againstDb.length,
    title_near_duplicates: titleNear.length,
    exact,
    againstDb,
    titleNear,
  };
}
