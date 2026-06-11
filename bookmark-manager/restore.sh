#!/usr/bin/env bash
set -euo pipefail
# Restore from a backup-*.tar.gz produced by backup.sh
cd "$(dirname "$0")"
set -a; source .env; set +a

if [ -z "${1:-}" ]; then
  echo "Usage: ./restore.sh backups/backup-XXXX.tar.gz"
  exit 1
fi
FILE="$1"
[ -f "$FILE" ] || { echo "❌ $FILE not found"; exit 1; }

TMP=$(mktemp -d)
tar xzf "$FILE" -C "$TMP"

echo "📥  Restoring database..."
cat "$TMP/db.sql" | docker compose exec -T postgres psql -U "${POSTGRES_USER:-bookmarkuser}" -d "${POSTGRES_DB:-bookmarks}"

if [ -f "$TMP/screenshots.tar.gz" ]; then
  echo "🖼️  Restoring screenshots..."
  docker run --rm -v bookmark-manager_screenshots:/data -v "$TMP":/in alpine \
    sh -c 'cd /data && tar xzf /in/screenshots.tar.gz'
fi

rm -rf "$TMP"
echo "✅  Restore complete. Restart services:  docker compose restart"
