# Self-Hosted Bookmark Manager

Personal bookmark manager with BookmarkOS-style UI, deployed on Hetzner CX33 (or any Linux box) with Tailscale for secure access.

## Features

- Bookmark management with hierarchical folders and tags
- Automatic screenshot capture (OG image + Puppeteer fallback)
- Full-text search with PostgreSQL (GIN + Trigram)
- Tab session management (save & restore groups of links)
- Reading list with priority queue
- Markdown notes per folder
- Real-time sync across devices (WebSocket)
- Import from Chrome, Firefox, Safari, Edge (HTML/JSON) with duplicate detection & analysis
- Vikunja task integration (sidebar widget, create-from-bookmark, mark done)
- Secure access via Tailscale (no public ports)

## Architecture

- **Frontend**: React 18 PWA (Vite + Tailwind + Zustand) served by nginx
- **Backend**: Node.js 20 / Express REST + WebSocket
- **Database**: PostgreSQL 16 (full-text search)
- **Cache**: Redis 7
- **Screenshots**: dedicated Puppeteer microservice (isolated container)
- **Reverse Proxy**: nginx (sidecar with Tailscale)
- **Network**: Tailscale sidecar (encrypted WireGuard)

## Quick Start

### Prerequisites

- Linux server (tested on Hetzner CX33 / 8GB / 4 vCPU)
- Docker 24+ and Docker Compose v2
- Tailscale account & auth key

### Installation

```bash
# 1. Copy this directory to your server
scp -r bookmark-manager user@your-server:/home/user/
ssh user@your-server
cd /home/user/bookmark-manager

# 2. Configure environment
cp .env.example .env
nano .env   # fill in TS_AUTHKEY, POSTGRES_PASSWORD, JWT_SECRET, VIKUNJA_*

# 3. Deploy
chmod +x deploy.sh backup.sh restore.sh
./deploy.sh
```

Once deployed, access from any device on your Tailnet:

```
http://bookmark-manager
```

(The hostname is whatever you set as `TS_HOSTNAME` in `.env`, default `bookmark-manager`.)

## Configuration (.env)

| Variable | Description | Default |
|---|---|---|
| `TS_AUTHKEY` | Tailscale auth key (from https://login.tailscale.com/admin/settings/keys) | **required** |
| `TS_HOSTNAME` | Tailscale machine name | `bookmark-manager` |
| `POSTGRES_PASSWORD` | PostgreSQL password | **required** |
| `POSTGRES_USER` | PostgreSQL user | `bookmarkuser` |
| `POSTGRES_DB` | PostgreSQL DB name | `bookmarks` |
| `JWT_SECRET` | Reserved for future auth | random |
| `VIKUNJA_API_URL` | Your Vikunja base URL (e.g. https://vikunja.example.com/api/v1) | optional |
| `VIKUNJA_TOKEN` | Vikunja personal API token (Bearer) | optional |
| `DEFAULT_USER_EMAIL` | Auto-seeded single-user email | `me@local` |

## Management Commands

```bash
# Logs
docker compose logs -f
docker compose logs -f backend

# Restart
docker compose restart

# Stop / wipe
docker compose down
docker compose down -v   # ⚠️ deletes data

# Tailscale status
docker compose exec tailscale tailscale status

# Database backup / restore
./backup.sh
./restore.sh backup-2026-06-11.tar.gz
```

## Browser Extension Companion\n\nA Manifest V3 extension lives at [`extension/`](extension/) for Chrome / Edge / Brave / Firefox.\n\n- Toolbar popup: one-click save the current tab\n- One click to save **all open tabs in this window** as a Session\n- Right-click any page or link \u2192 *Save to Bookmark Manager*\n- Keyboard shortcuts: `Ctrl/Cmd+Shift+S` (save tab), `Ctrl/Cmd+Shift+A` (save all as session)\n- Default folder + tags configurable in extension Options\n\nLoad it via `chrome://extensions/` \u2192 **Load unpacked** \u2192 select `extension/`. Full setup in [extension/README.md](extension/README.md).\n\n## Importing Bookmarks

1. Export from your browser:
   - **Chrome/Edge/Brave**: Bookmark manager → ⋮ → Export bookmarks
   - **Firefox**: Library → Bookmarks → Show All → Import and Backup → Export to HTML
   - **Safari**: File → Export → Bookmarks
2. In the app, click **Import** → select your `.html` / `.json` file.
3. Review the analysis (duplicates, folders, tags, domains).
4. Choose dedupe strategy (skip / merge / keep all) and confirm.

## Vikunja Integration

1. In Vikunja, create a personal API token (Settings → API tokens).
2. Set `VIKUNJA_API_URL` and `VIKUNJA_TOKEN` in `.env`.
3. Restart backend: `docker compose restart backend`.
4. Task widget appears in the sidebar; create tasks from any bookmark.

## Resource Usage (CX33)

| Service | RAM | Storage |
|---|---|---|
| frontend (nginx) | ~30 MB | 50 MB |
| backend | ~180 MB | 50 MB |
| postgres | ~120 MB | 500 MB+ |
| redis | ~40 MB | 50 MB |
| screenshot | ~300 MB (burst) | 2 GB |
| nginx (proxy) | ~20 MB | 10 MB |
| tailscale | ~15 MB | 10 MB |
| **Total** | **~700 MB** | **~3 GB** |

## Troubleshooting

- **Tailscale not connecting** → `docker compose logs tailscale`; regenerate auth key.
- **Screenshots failing** → `docker compose logs screenshot`; bump memory in `docker-compose.yml`.
- **DB connection errors** → `docker compose exec postgres psql -U bookmarkuser -d bookmarks -c '\\l'`.

## License

MIT — Personal use.
