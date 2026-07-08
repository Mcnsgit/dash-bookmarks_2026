# Deployment Guide

Step-by-step setup for a clean Hetzner CX33 (or any Ubuntu/Debian server). All commands assume you ssh in as a non-root user with `sudo`.

---

## Table of contents

1. [Provision the server](#1-provision-the-server)
2. [Install Docker + Compose](#2-install-docker--compose)
3. [Sign up for Tailscale + get an auth key](#3-tailscale-auth-key)
4. [Copy the project to your server](#4-copy-the-project)
5. [Configure `.env` (secrets)](#5-configure-env)
6. [(Optional) Set up OIDC / SSO](#6-optional-oidc--sso)
7. [(Optional) Configure Vikunja](#7-optional-vikunja)
8. [Deploy](#8-deploy)
9. [Access the app & complete first-run setup](#9-first-run)
10. [Install the browser extension](#10-browser-extension)
11. [Backups, upgrades, day-2 ops](#11-day-2-ops)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Provision the server

If you already have a server, skip this. Otherwise on Hetzner Cloud:

1. Console → **+ Add Server**
2. **Location**: anywhere (CX33 is available in fsn1/nbg1/hel1).
3. **Image**: Ubuntu 24.04 (or Debian 12).
4. **Type**: **CX33** (4 vCPU / 8 GB / 80 GB) → covers all services with room to spare.
5. **SSH key**: upload yours.
6. **Networking**: enable IPv4 (you'll never expose ports publicly anyway, but you need outbound for pulls).
7. **Cloud-init** (optional): paste this to set up a non-root user automatically:
   ```yaml
   #cloud-config
   users:
     - name: deploy
       sudo: ALL=(ALL) NOPASSWD:ALL
       groups: [sudo, docker]
       shell: /bin/bash
       ssh_authorized_keys:
         - ssh-ed25519 AAAA... your-public-key
   package_update: true
   package_upgrade: true
   ```
8. Create the server. Note the IPv4 address.

Log in:
```bash
ssh deploy@<HETZNER_IPV4>
```

> **Important**: Do **not** open any firewall ports beyond SSH (22). Tailscale will handle the rest.

---

## 2. Install Docker + Compose

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
exec sg docker newgrp $(id -gn)        # re-evaluate group membership

docker --version
docker compose version
```

(Debian: replace `ubuntu` with `debian` in the URLs.)

---

## 3. Tailscale auth key

1. Open https://login.tailscale.com/admin/settings/keys
2. **Generate auth key** with:
   - **Reusable**: off (one-shot is safer)
   - **Ephemeral**: off (we want the host to persist)
   - **Pre-approved**: on (so the container joins without manual approval)
   - **Tags**: e.g. `tag:server` (optional, requires defining the tag in your ACLs)
3. Copy the key (starts with `tskey-auth-…`).

If you want a friendly hostname (so the URL is `http://bookmark-manager` instead of an IP):

1. Tailscale admin → **DNS** → enable **MagicDNS**.
2. The container will register as `bookmark-manager` (whatever you set as `TS_HOSTNAME`).

---

## 4. Copy the project

Two options — pick one:

### Option A — scp the tarball

On your **local** machine (where `bookmark-manager.tar.gz` lives):
```bash
scp bookmark-manager.tar.gz deploy@<HETZNER_IPV4>:~
```

On the **server**:
```bash
tar xzf bookmark-manager.tar.gz
cd bookmark-manager
chmod +x deploy.sh backup.sh restore.sh
```

### Option B — push to your own Git repo

Locally:
```bash
cd bookmark-manager
git init && git add . && git commit -m "Initial commit"
git remote add origin git@github.com:you/bookmark-manager.git
git push -u origin main
```
On the server:
```bash
git clone git@github.com:you/bookmark-manager.git
cd bookmark-manager
chmod +x deploy.sh backup.sh restore.sh
```

---

## 5. Configure `.env`

```bash
cp .env.example .env

# Generate strong secrets
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=')"   # paste into .env
echo "JWT_SECRET=$(openssl rand -hex 32)"                            # paste into .env

nano .env       # or vim / your editor of choice
```

**Required values**:

| Variable | Value |
|---|---|
| `TS_AUTHKEY` | The Tailscale auth key from step 3 |
| `TS_HOSTNAME` | e.g. `bookmark-manager` |
| `POSTGRES_PASSWORD` | output from `openssl rand …` above |
| `JWT_SECRET` | output from `openssl rand …` above |
| `AUTH_ENABLED` | leave as `true` |

Leave OIDC and Vikunja blank for now — we'll do them later.

---

## 6. (Optional) OIDC / SSO

If you want **Sign in with Google / Authentik / Keycloak / Auth0** instead of (or in addition to) email + password, configure this **before** first deploy so the SSO button appears on the setup screen.

The redirect URI you register with the provider must be:

```
http://<your-domain-or-ip>/api/auth/oidc/callback
```
or
```
https://<your-domain-or-ip>/api/auth/oidc/callback
```
(e.g. `https://bookmark-home.example.com/api/auth/oidc/callback` or `http://192.168.1.100/api/auth/oidc/callback`)

> Google **requires HTTPS** for redirect URIs *unless* the origin is `localhost`.
> Behind Tailscale you can either:
> 1. Use **Authentik / Keycloak / Auth0** instead (they accept `http://` for tailnet hosts), **or**
> 2. Put **Caddy with Tailscale HTTPS** (`tailscale cert`) in front of nginx so the app is reachable at `https://bookmark-manager.<your-tailnet>.ts.net` — see the [Caddy + Tailscale docs](https://tailscale.com/kb/1153/enabling-https) — then use that HTTPS URL.

### 6a. Google example

1. https://console.cloud.google.com → APIs & Services → OAuth consent screen → set up an *External* or *Internal* app.
2. Credentials → **+ Create credentials → OAuth client ID** → *Web application*.
3. **Authorized redirect URIs**:
   `https://<your-domain-or-ip>/api/auth/oidc/callback` (must be HTTPS)
4. Copy **Client ID** and **Client secret**.
5. Edit `.env`:
   ```env
   OIDC_ENABLED=true
   OIDC_PROVIDER_NAME=Google
   OIDC_ISSUER_URL=https://accounts.google.com
   OIDC_CLIENT_ID=...apps.googleusercontent.com
   OIDC_CLIENT_SECRET=...
   OIDC_REDIRECT_URI=https://<your-domain-or-ip>/api/auth/oidc/callback
   OIDC_SCOPES=openid email profile
   OIDC_ALLOWED_EMAILS=you@gmail.com
   ```

### 6b. Authentik example (self-hosted)

1. Authentik admin → **Providers** → *Create* → **OAuth2/OpenID Provider**:
   - Name: `bookmark-manager`
   - Authorization flow: `default-provider-authorization-implicit-consent`
   - Client type: **Confidential**
   - **Redirect URIs**: `https://<your-domain-or-ip>/api/auth/oidc/callback` (or `http` if not using SSL)
   - Signing key: pick the default
2. **Applications** → *Create* → link to the provider, slug `bookmark-manager`.
3. Copy **Client ID** + **Client secret** from the provider page.
4. The OIDC issuer URL is shown on the provider page; usually:
   `https://authentik.example.com/application/o/bookmark-manager/`
5. Edit `.env`:
   ```env
   OIDC_ENABLED=true
   OIDC_PROVIDER_NAME=Authentik
   OIDC_ISSUER_URL=https://authentik.example.com/application/o/bookmark-manager/
   OIDC_CLIENT_ID=...
   OIDC_CLIENT_SECRET=...
   OIDC_REDIRECT_URI=https://<your-domain-or-ip>/api/auth/oidc/callback
   OIDC_ALLOWED_EMAILS=you@example.com
   ```

### 6c. Note about GitHub

GitHub speaks **OAuth2**, not OIDC, so this app can't talk to it directly. Use Authentik / Keycloak with a GitHub source to bridge it.

---

## 7. (Optional) Vikunja

1. In Vikunja → user menu → **Settings** → **API tokens** → *Create*.
2. Copy the token.
3. Edit `.env`:
   ```
   VIKUNJA_API_URL=https://vikunja.example.com/api/v1
   VIKUNJA_TOKEN=<paste token>
   ```

---

## 8. Deploy

```bash
./deploy.sh
```

This will:

1. Sanity-check `.env`
2. `docker compose build --pull` all images (~3-5 minutes first time)
3. Start everything in detached mode
4. Show `tailscale status` (you should see your tailnet IP)

Watch the logs:
```bash
docker compose logs -f --tail=50
```

You can `Ctrl+C` to detach; containers keep running.

---

## 9. First-run

In a browser **on a device that's already on your Tailnet** (your laptop with Tailscale running, your phone, etc.) go to:

```
http://bookmark-manager
```

You'll see one of:

- **Setup screen** (first run, no user exists yet) → fill email + password (8+ chars). If OIDC is configured you'll also see **Set up with Google/Authentik** — clicking it will create the user using your SSO identity instead of a password.
- **Sign-in screen** → log in normally.

After signing in you land on the dashboard.

If your browser can't resolve `http://bookmark-manager`:
- Double-check the Tailscale admin → DNS → MagicDNS is ON for your tailnet.
- Or just use the tailnet IP: `tailscale status` on the server prints it, e.g. `http://100.64.0.5`.

---

## 10. Browser extension

1. In the web app → click your avatar (top right) → **Settings & tokens** → **Personal access tokens** → **New token** → name it `Browser extension` → **Copy** the `bmpat_…` token shown in the green banner (you'll only see it once).
2. On the same machine, open Chrome/Edge/Brave → `chrome://extensions/` → toggle **Developer mode** → **Load unpacked** → pick the `extension/` directory.
3. Pin the extension → click it → ⚙️ → enter:
   - **Backend URL**: `http://bookmark-manager` (or your tailnet IP/HTTPS URL)
   - **Personal Access Token**: paste the token from step 1
4. **Test connection** → should say `✔ signed in as you@…`. **Save settings**.
5. Now click the toolbar icon on any page → *Save this tab* or *Save all N tabs as session*.
6. Keyboard shortcuts: `Ctrl/Cmd+Shift+S` (save tab) · `Ctrl/Cmd+Shift+A` (save all as session).

Firefox: `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → pick `extension/manifest.json`.

---

## 11. Day-2 ops

### Daily backup (recommended)

```bash
# Append to your crontab (`crontab -e`):
0 2 * * * cd /home/deploy/bookmark-manager && ./backup.sh >> backups/backup.log 2>&1

# Optionally upload to remote storage (e.g. Backblaze B2, Hetzner Storage Box, rclone…)
30 2 * * * rclone copy /home/deploy/bookmark-manager/backups/ remote:bookmark-backups --include "backup-*.tar.gz"
```

Restore:
```bash
./restore.sh backups/backup-2026-06-11_020005.tar.gz
docker compose restart
```

### Upgrades

```bash
cd ~/bookmark-manager
git pull                     # or: re-extract a new tarball over the directory
docker compose build --pull
docker compose up -d
docker image prune -f        # reclaim space
```

### Rotate JWT secret (logs everyone out)

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env   # then delete the old line
docker compose restart backend
```

### Revoke an extension token

Web app → Settings → Personal access tokens → 🗑️ next to the token.

### Forgot password (no OIDC)

```bash
docker compose exec postgres psql -U bookmarkuser -d bookmarks -c \
  "UPDATE users SET password_hash = NULL;"
# Open the app → it'll show the setup screen again so you can set a new password.
```

### Add OIDC after first-run

You can enable OIDC after you've been using the app for a while:
1. Configure `OIDC_*` vars in `.env` (section 6).
2. Make sure `OIDC_ALLOWED_EMAILS` contains the **same email** as your existing user.
3. `docker compose restart backend`.
4. Sign in via SSO once — the existing user record is automatically linked.

---

## 12. Troubleshooting

### `http://bookmark-manager` doesn't resolve

```bash
# On the server:
docker compose logs tailscale | tail -50
docker compose exec tailscale tailscale status
```

If status shows `NeedsLogin`, your auth key is stale — generate a new one and update `TS_AUTHKEY` in `.env`, then `docker compose up -d --force-recreate tailscale`.

### Backend won't start

```bash
docker compose logs backend | tail -50
```
Common cause: `JWT_SECRET` is blank or contains `changeme_…`.

### Screenshots are all blank

```bash
docker compose logs screenshot | tail -50
```
Bump memory if you see OOM kills — edit `docker-compose.yml` → service `screenshot` → `mem_limit: 1500m`.

### Postgres `password authentication failed`

You probably changed `POSTGRES_PASSWORD` after the volume was first initialized. Wipe & re-init (⚠️ destroys data):
```bash
docker compose down -v
./deploy.sh
```
…then restore from a backup if you have one.

### OIDC redirect_uri_mismatch

The redirect URI in `.env` must match **byte-for-byte** what you registered with the provider. Look out for:
- trailing slash (don't add one)
- `http` vs `https`
- hostname vs IP

---

## You're done 🎉

Open `http://bookmark-manager` on any device on your tailnet. Use the extension to save tabs from anywhere. Tasks from Vikunja show up in the sidebar. All data lives only on your Hetzner box, accessible only via your encrypted Tailscale tunnel.

Ping the maintainer if anything misbehaves — and include `docker compose logs <service>` output for fastest diagnosis.
