#!/usr/bin/env bash
# Posthive backup: verified Postgres dump + uploads archive into /opt/posthive/backups.
#
# Usage: scripts/backup.sh [label]     e.g. daily | pre-migrate | pre-deploy-<sha7> | manual
#
# A dump is only kept after `pg_restore --list` can read it. The uploads volume is read from
# its host mountpoint and is never created here (creating it outside Compose would leave it
# owned by root and break uploads).
set -euo pipefail
umask 077

ROOT=/opt/posthive
BACKUP_DIR="$ROOT/backups"
UPLOADS_VOLUME=posthive-prod_uploads
LABEL="${1:-manual}"
case "$LABEL" in *[!A-Za-z0-9._-]*) echo "invalid label: $LABEL" >&2; exit 2 ;; esac

cd "$ROOT"
exec 9>"$ROOT/.backup.lock"
flock -w 900 9 || { echo "another backup is still running" >&2; exit 1; }

name="posthive-$(date -u +%Y%m%dT%H%M%SZ)-$LABEL"
base="$BACKUP_DIR/$name"
trap 'rm -f -- "$base.dump.tmp" "$base.uploads.tgz.tmp"' EXIT

# --- Database ------------------------------------------------------------------------------
docker compose exec -T db pg_dump -U posthive -d posthive -Fc > "$base.dump.tmp"
entries="$(docker compose exec -T db pg_restore --list < "$base.dump.tmp" | { grep -cE '^[0-9]+;' || true; })"
mv -- "$base.dump.tmp" "$base.dump"
echo "db: $name.dump ($(stat -c %s "$base.dump") bytes, $entries TOC entries)"

# --- Uploads -------------------------------------------------------------------------------
if mountpoint="$(docker volume inspect -f '{{.Mountpoint}}' "$UPLOADS_VOLUME" 2>/dev/null)"; then
  tar -C "$mountpoint" -czf "$base.uploads.tgz.tmp" .
  files="$(tar -tzf "$base.uploads.tgz.tmp" | { grep -vc '/$' || true; })"
  mv -- "$base.uploads.tgz.tmp" "$base.uploads.tgz"
  echo "uploads: $name.uploads.tgz ($files files)"
else
  echo "uploads: volume $UPLOADS_VOLUME does not exist yet, skipped"
fi

( cd "$BACKUP_DIR" && sha256sum -- "$name".* ) >> "$BACKUP_DIR/SHA256SUMS"

# --- Retention: 14 days of daily backups, the 10 most recent pre-deploy backups -------------
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'posthive-*-daily.*' -mtime +14 -delete
shopt -s nullglob
predeploy=( "$BACKUP_DIR"/posthive-*-pre-deploy-*.dump )
if (( ${#predeploy[@]} > 10 )); then
  ls -1t -- "${predeploy[@]}" | tail -n +11 | while read -r old; do
    rm -f -- "$old" "${old%.dump}.uploads.tgz"
  done
fi

echo "backup ok: $base"
