#!/usr/bin/env bash
set -euo pipefail
# Backup PostgreSQL + screenshot volume to a tarball.
cd "$(dirname "$0")"
set -a; source .env; set +a

STAMP=$(date +%Y-%m-%d_%H%M%S)
DIR="./backups"
mkdir -p "$DIR"
TMP=$(mktemp -d)

echo "💾  Dumping database..."
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-bookmarkuser}" "${POSTGRES_DB:-bookmarks}" > "$TMP/db.sql"

echo "🖼️  Copying screenshots volume..."
docker run --rm -v bookmark-manager_screenshots:/data -v "$TMP":/out alpine \
  tar czf /out/screenshots.tar.gz -C /data . || echo "(no screenshots yet)"

TAR="$DIR/backup-$STAMP.tar.gz"
tar czf "$TAR" -C "$TMP" .
rm -rf "$TMP"

echo "✅  Wrote $TAR"
