// URL normalization helpers used for duplicate detection.

export function normalizeUrl(input) {
  if (!input) return '';
  let u = String(input).trim();
  try {
    // Add scheme if missing
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    const parsed = new URL(u);

    // Lowercase host, strip trailing slash, strip default ports, strip fragment.
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith('www.')) host = host.slice(4);

    // Drop common tracking query params.
    const drop = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'gclid', 'fbclid', 'mc_cid', 'mc_eid', '_ga', 'ref', 'ref_src'
    ];
    drop.forEach((k) => parsed.searchParams.delete(k));

    let path = parsed.pathname.replace(/\/+$/g, '');
    if (path === '') path = '/';

    const search = parsed.searchParams.toString();
    return `${parsed.protocol}//${host}${path}${search ? '?' + search : ''}`;
  } catch {
    return u.toLowerCase();
  }
}

export function getDomain(input) {
  try {
    const u = new URL(/^https?:\/\//i.test(input) ? input : 'https://' + input);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

export function isValidUrl(input) {
  try {
    new URL(/^https?:\/\//i.test(input) ? input : 'https://' + input);
    return true;
  } catch {
    return false;
  }
}
