import { getSettings, setSettings, apiFetch } from './lib.js';

const $ = (s) => document.querySelector(s);

function normalize(u) {
  if (!u) return '';
  let s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
  return s.replace(/\/+$/, '');
}

async function loadFolders() {
  const sel = $('#defaultFolderId');
  sel.innerHTML = '<option value="">— None —</option>';
  try {
    const folders = await apiFetch('/api/folders');
    folders.forEach((f) => {
      const opt = document.createElement('option');
      opt.value = f.id; opt.textContent = f.name;
      sel.appendChild(opt);
    });
    const s = await getSettings();
    if (s.defaultFolderId) sel.value = s.defaultFolderId;
  } catch (e) {
    // backend unreachable, that's fine in options
  }
}

async function init() {
  const s = await getSettings();
  $('#backendUrl').value     = s.backendUrl || '';
  $('#defaultTags').value    = s.defaultTags || '';
  $('#capturePinned').checked = !!s.capturePinned;
  $('#healthUrl').textContent = (normalize(s.backendUrl) || '<set backend URL>') + '/api/health';
  await loadFolders();
}

$('#backendUrl').addEventListener('input', () => {
  $('#healthUrl').textContent = (normalize($('#backendUrl').value) || '<set backend URL>') + '/api/health';
});

$('#testConn').addEventListener('click', async () => {
  const url = normalize($('#backendUrl').value);
  const out = $('#testResult');
  out.textContent = 'Testing…'; out.dataset.kind = '';
  if (!url) { out.textContent = ' missing URL'; out.dataset.kind = 'err'; return; }
  try {
    const r = await fetch(url + '/api/health');
    if (!r.ok) throw new Error(r.statusText);
    const j = await r.json();
    out.textContent = ' ✔ reachable (' + JSON.stringify(j) + ')'; out.dataset.kind = 'ok';
    await setSettings({ backendUrl: url });
    await loadFolders();
  } catch (e) {
    out.textContent = ' ✖ ' + e.message; out.dataset.kind = 'err';
  }
});

$('#save').addEventListener('click', async () => {
  await setSettings({
    backendUrl: normalize($('#backendUrl').value),
    defaultFolderId: $('#defaultFolderId').value,
    defaultTags: $('#defaultTags').value,
    capturePinned: $('#capturePinned').checked,
  });
  const s = $('#saveStatus');
  s.textContent = ' Saved ✔'; s.dataset.kind = 'ok';
  setTimeout(() => { s.textContent = ''; }, 1500);
  await loadFolders();
});

init();
