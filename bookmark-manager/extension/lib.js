// Cross-browser shim (Chrome MV3 uses `chrome`; Firefox provides both).
const api = typeof browser !== 'undefined' ? browser : chrome;

const DEFAULTS = {
  backendUrl: '',          // e.g. http://bookmark-manager  or  http://100.64.0.1
  defaultFolderId: '',
  defaultTags: '',
  capturePinned: false,
};

export async function getSettings() {
  return new Promise((resolve) => {
    api.storage.sync.get(DEFAULTS, (data) => resolve({ ...DEFAULTS, ...data }));
  });
}

export async function setSettings(patch) {
  return new Promise((resolve) => api.storage.sync.set(patch, resolve));
}

function baseUrl(u) {
  if (!u) return '';
  let s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
  return s.replace(/\/+$/, '');
}

export async function apiFetch(path, opts = {}) {
  const { backendUrl } = await getSettings();
  const base = baseUrl(backendUrl);
  if (!base) throw new Error('Backend URL not configured. Open the extension options first.');
  const res = await fetch(base + path, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

export async function saveBookmark({ url, title, folder_id, tags }) {
  return apiFetch('/api/bookmarks', {
    method: 'POST',
    body: { url, title, folder_id: folder_id || null, tags: tags || [] },
  });
}

export async function saveSession({ name, description, tabs }) {
  return apiFetch('/api/sessions', {
    method: 'POST',
    body: { name, description, tabs },
  });
}

export async function listFolders() {
  return apiFetch('/api/folders');
}

export function tabsApi() { return api.tabs; }
export function runtime()  { return api.runtime; }
export function notifications() { return api.notifications; }
export function commands() { return api.commands; }
export function contextMenus() { return api.contextMenus; }

export function notify(title, message) {
  try {
    api.notifications?.create?.('', {
      type: 'basic',
      iconUrl: api.runtime.getURL('icons/icon-128.png'),
      title,
      message,
    });
  } catch (_) {}
}
