#!/usr/bin/env bash
set -euo pipefail

# Self-hosted Bookmark Manager - deploy script
#
# Usage:  ./deploy.sh

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "❌ .env not found. Copy .env.example to .env and configure it first."
  exit 1
 fi

# Sanity-check required vars
required=(TS_AUTHKEY POSTGRES_PASSWORD JWT_SECRET)
missing=0
set -a; source .env; set +a
for v in "${required[@]}"; do
  val="${!v:-}"
  if [ -z "$val" ] || [[ "$val" == *REPLACE_ME* ]] || [[ "$val" == changeme* ]]; then
    echo "❌ $v is not set in .env (got: '$val')"
    missing=1
  fi
done
[ "$missing" -eq 1 ] && exit 1

echo "🔨  Building images..."
docker compose build --pull

echo "🚀  Starting services..."
docker compose up -d

echo
echo "🔎  Service status:"
docker compose ps

echo
echo "⏳  Waiting for Tailscale to come up..."
sleep 8
docker compose exec -T tailscale tailscale status || true

echo
echo "✅ Deploy finished."
echo "   Open  http://${TS_HOSTNAME:-bookmark-manager}  on any device on your Tailnet."
