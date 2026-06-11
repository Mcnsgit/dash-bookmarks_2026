# Bookmark Manager — Browser Extension

One-click save tabs, or capture an entire window of tabs as a Session, sending them to your self-hosted bookmark manager.

Works in **Chrome**, **Edge**, **Brave**, and **Firefox** (Manifest V3).

## Features

- Toolbar popup: save the current tab into a folder with tags
- One click to save **ALL open tabs in the current window** as a Session
- Right-click any page or link → *Save to Bookmark Manager*
- Keyboard shortcuts
  - `Ctrl/Cmd + Shift + S` — save current tab
  - `Ctrl/Cmd + Shift + A` — save all tabs as a session
- Configurable default folder + tags, optionally include pinned tabs
- Light/dark UI follows your OS theme
- All traffic stays on your Tailnet (the extension talks to your backend URL)

## Install

### Chrome / Edge / Brave (developer mode)

1. Open `chrome://extensions/`
2. Toggle **Developer mode** ON (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repo
5. Click the puzzle-piece icon in the toolbar and pin **Bookmark Manager Companion**
6. Click the extension → ⚙️
   - Enter your backend URL  *(e.g. `http://bookmark-manager` on your Tailnet, or `http://100.x.y.z`)*
   - **If your server has auth enabled** (default), open the web app → Settings → Personal access tokens → **New token**, copy it, and paste it into the extension's **Personal Access Token** field.
   - Press **Test connection** → should say `✔ signed in as you@example.com`. Save.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select `extension/manifest.json`
4. (Same configuration as above)

> For a permanent Firefox install, zip the `extension/` folder and self-sign via
> Mozilla Add-on Developer Hub, or use Firefox ESR / Developer Edition with the
> `xpinstall.signatures.required = false` flag.

## Packaging as a zip (for distribution)

```bash
cd extension
zip -r ../bookmark-companion.zip . -x '*.md' '*.DS_Store'
```

## Permissions explained

| Permission | Why |
|---|---|
| `tabs`         | Read tab URLs/titles for saving |
| `activeTab`    | Read the *current* tab when you click “Save” |
| `storage`      | Save your backend URL + preferences |
| `contextMenus` | Right-click “Save to Bookmark Manager” |
| `notifications`| Toast on success/failure |
| `host_permissions: <all_urls>` | So the extension can fetch your backend URL on the Tailnet (any IP/hostname). If you prefer, narrow this to your exact tailnet host. |

## Limitations / Notes

- The backend is **single-user** with optional JWT auth (`AUTH_ENABLED=true` by default).
- When auth is on, the extension authenticates via a **Personal Access Token (PAT)** created in the web app's Settings. Tokens are long-lived and revocable.
- When auth is off (`AUTH_ENABLED=false`), the PAT field can be left blank.
- `chrome:`/`about:` pages can't be saved (browsers block extensions from reading those URLs).
