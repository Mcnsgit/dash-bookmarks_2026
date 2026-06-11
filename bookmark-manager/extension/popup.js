import { getSettings, runtime, tabsApi } from './lib.js';

const $ = (sel) => document.querySelector(sel);

function setStatus(text, kind) {
  const el = $('#status');
  el.textContent = text || '';
  el.dataset.kind = kind || '';
}

async function init() {
  const settings = await getSettings();
  if (!settings.backendUrl) {
    $('#main').classList.add('hidden');
    $('#setup').classList.remove('hidden');
    return;
  }
  $('#tags').value = settings.defaultTags || '';

  // Current tab info
  const [tab] = await new Promise((r) => tabsApi().query({ active: true, currentWindow: true }, r));
  $('#title').textContent = tab?.title || '—';
  $('#url').textContent = tab?.url || '—';
  if (tab?.favIconUrl) $('#favicon').src = tab.favIconUrl;

  // Tab count for session
  const allTabs = await new Promise((r) => tabsApi().query({ currentWindow: true }, r));
  const saveable = allTabs.filter((t) => /^https?:/i.test(t.url || '') && (settings.capturePinned || !t.pinned));
  $('#tabCount').textContent = saveable.length;
  $('#sessionName').value = `Window — ${new Date().toLocaleString()}`;

  // Populate folders
  try {
    const folders = await new Promise((resolve, reject) =>
      runtime().sendMessage({ type: 'list-folders' }, (r) => {
        if (!r) return reject(new Error('No response'));
        r.ok ? resolve(r.data) : reject(new Error(r.error));
      })
    );
    const sel = $('#folder');
    folders.forEach((f) => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.name;
      if (settings.defaultFolderId === f.id) opt.selected = true;
      sel.appendChild(opt);
    });
  } catch (e) {
    setStatus('Could not load folders: ' + e.message, 'err');
  }

  $('#saveTab').addEventListener('click', async () => {
    const tab = (await new Promise((r) => tabsApi().query({ active: true, currentWindow: true }, r)))[0];
    if (!tab) return setStatus('No active tab', 'err');
    setStatus('Saving…', '');
    runtime().sendMessage({ type: 'save-current', tab,
      folder_id: $('#folder').value || null,
      tags: $('#tags').value
    }, (resp) => {
      if (!resp) return setStatus('Background not responding', 'err');
      if (resp.ok) { setStatus('Saved ✓', 'ok'); setTimeout(() => window.close(), 700); }
      else         { setStatus('Error: ' + resp.error, 'err'); }
    });
  });

  $('#saveSession').addEventListener('click', () => {
    setStatus('Saving session…', '');
    runtime().sendMessage({ type: 'save-session', name: $('#sessionName').value }, (resp) => {
      if (!resp) return setStatus('Background not responding', 'err');
      if (resp.ok) { setStatus(`Session saved ✓ (${resp.data?.id ? 'id ' + resp.data.id.slice(0, 8) : ''})`, 'ok'); setTimeout(() => window.close(), 900); }
      else         { setStatus('Error: ' + resp.error, 'err'); }
    });
  });

  const openOptions = () => chrome.runtime.openOptionsPage?.() || browser?.runtime?.openOptionsPage?.();
  $('#openOptions').addEventListener('click', (e) => { e.preventDefault(); openOptions(); });
}

const openOptions = () => chrome.runtime.openOptionsPage?.() || browser?.runtime?.openOptionsPage?.();
document.getElementById('openOptions2')?.addEventListener('click', openOptions);

init().catch((e) => setStatus(e.message, 'err'));
