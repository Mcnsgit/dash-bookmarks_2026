# dash-bookmarks_2026

This repository hosts the **self-hosted bookmark manager**.

> 📁 **All code, docs, docker config, browser extension, and the deployment guide live in [`bookmark-manager/`](./bookmark-manager/).**

## Quick links

- [`bookmark-manager/README.md`](bookmark-manager/README.md) — feature overview, configuration, `.env`
- [`bookmark-manager/DEPLOYMENT.md`](bookmark-manager/DEPLOYMENT.md) — step-by-step Hetzner + Tailscale + OIDC deployment guide
- [`bookmark-manager/extension/README.md`](bookmark-manager/extension/README.md) — browser extension companion (Chrome / Firefox)
- `.github/workflows/ci.yml` — CI pipeline (lint, tests, build)

## Architecture (single unified stack)

- **Backend**: Node.js 20 + Express + Postgres 16 + Redis 7
- **Frontend**: React 18 + Vite + Tailwind (PWA, served by nginx)
- **Screenshot service**: Puppeteer + Chromium (isolated container)
- **Reverse proxy**: nginx sharing Tailscale's network namespace (sidecar)
- **Auth**: JWT, optional OIDC/SSO, Personal Access Tokens for the extension

The earlier FastAPI/MongoDB and CRA template directories (`backend/`, `frontend/`) have been removed — they were unused Emergent platform scaffolding and contained no business logic. See `bookmark-manager/UNIFICATION.md` for the full migration write-up.
