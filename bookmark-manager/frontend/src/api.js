// Minimal fetch wrapper.
const base = '/api';
const TOKEN_KEY = 'bm.token';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}
export function setToken(t) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else   localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

async function http(method, path, body, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(base + path, { method, headers, body: payload });
  if (res.status === 401) {
    // Token invalid/expired \u2014 clear it and let the app re-route to login.
    setToken('');
    window.dispatchEvent(new CustomEvent('bm:unauthorized'));
  }
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : res.text();
}

export const api = {
  get:   (p, q) => http('GET',   p + (q ? '?' + new URLSearchParams(q) : '')),
  post:  (p, b) => http('POST',  p, b),
  patch: (p, b) => http('PATCH', p, b),
  del:   (p)    => http('DELETE',p),
  upload: (p, file, fields = {}) => {
    const fd = new FormData();
    if (file) fd.append('file', file);
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    return http('POST', p, fd);
  },
};

// WebSocket (live updates)
let ws = null;
const listeners = new Set();
export function connectWs() {
  if (ws && ws.readyState === 1) return;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  try {
    ws = new WebSocket(`${proto}://${location.host}/api/ws`);
    ws.onmessage = (e) => {
      try { const m = JSON.parse(e.data); listeners.forEach((cb) => cb(m)); } catch {}
    };
    ws.onclose = () => setTimeout(connectWs, 2000);
  } catch { setTimeout(connectWs, 5000); }
}
export function onWs(cb) { listeners.add(cb); return () => listeners.delete(cb); }
