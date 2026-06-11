// Service worker / background script
import {
  apiFetch, saveBookmark, saveSession, getSettings, notify, tabsApi, runtime, commands, contextMenus,
} from './lib.js';

const api = typeof browser !== 'undefined' ? browser : chrome;

// Context menu — right-click anywhere or on a link to save.
async function setupMenus() {
  try { await contextMenus().removeAll(); } catch (_) {}
  contextMenus().create({ id: 'save-page',     title: 'Save page to Bookmark Manager',     contexts: ['page'] });
  contextMenus().create({ id: 'save-link',     title: 'Save link to Bookmark Manager',     contexts: ['link'] });
  contextMenus().create({ id: 'save-all-tabs', title: 'Save all tabs in this window as a session', contexts: ['action', 'page'] });
}
api.runtime.onInstalled.addListener(setupMenus);
api.runtime.onStartup?.addListener?.(setupMenus);

api.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (info.menuItemId === 'save-page' && tab) {
      await saveCurrentTab(tab);
    } else if (info.menuItemId === 'save-link' && info.linkUrl) {
      await saveBookmark({ url: info.linkUrl, title: info.selectionText || info.linkUrl });
      notify('Saved', info.linkUrl);
    } else if (info.menuItemId === 'save-all-tabs') {
      await saveAllTabsAsSession();
    }
  } catch (e) {
    notify('Save failed', e.message);
  }
});

// Keyboard commands
api.commands?.onCommand?.addListener(async (cmd) => {
  try {
    if (cmd === 'save-current-tab') {
      const [tab] = await new Promise((r) => tabsApi().query({ active: true, currentWindow: true }, r));
      if (tab) await saveCurrentTab(tab);
    } else if (cmd === 'save-all-tabs-as-session') {
      await saveAllTabsAsSession();
    }
  } catch (e) { notify('Save failed', e.message); }
});

// Message bridge for popup
api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === 'save-current')      sendResponse({ ok: true, data: await saveCurrentTab(msg.tab, { folder_id: msg.folder_id, tags: msg.tags }) });
      else if (msg?.type === 'save-session') sendResponse({ ok: true, data: await saveAllTabsAsSession(msg.name, msg.description) });
      else if (msg?.type === 'list-folders') sendResponse({ ok: true, data: await apiFetch('/api/folders') });
      else sendResponse({ ok: false, error: 'unknown' });
    } catch (e) { sendResponse({ ok: false, error: e.message }); }
  })();
  return true;          // async
});

async function saveCurrentTab(tab, opts = {}) {
  if (!tab?.url || !/^https?:/i.test(tab.url)) throw new Error('This tab cannot be saved (not http/https)');
  const settings = await getSettings();
  const tags = (opts.tags || settings.defaultTags || '').split(',').map((t) => t.trim()).filter(Boolean);
  const result = await saveBookmark({
    url: tab.url,
    title: tab.title,
    folder_id: opts.folder_id || settings.defaultFolderId,
    tags,
  });
  notify('Saved bookmark', tab.title || tab.url);
  return result;
}

async function saveAllTabsAsSession(customName, description) {
  const settings = await getSettings();
  const tabs = await new Promise((r) => tabsApi().query({ currentWindow: true }, r));
  const filtered = tabs
    .filter((t) => /^https?:/i.test(t.url || ''))
    .filter((t) => settings.capturePinned || !t.pinned)
    .map((t) => ({ url: t.url, title: t.title, favicon_url: t.favIconUrl }));
  if (filtered.length === 0) throw new Error('No saveable tabs found');
  const name = customName || `Session — ${new Date().toLocaleString()}`;
  const result = await saveSession({ name, description, tabs: filtered });
  notify('Saved session', `${filtered.length} tab${filtered.length === 1 ? '' : 's'} — ${name}`);
  return result;
}
