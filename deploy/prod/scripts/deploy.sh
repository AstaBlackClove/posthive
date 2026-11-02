#!/usr/bin/env bash
# Posthive deploy: switch the stack to images already loaded by build-and-ship.sh.
#
# Usage: scripts/deploy.sh <git-sha>
#
#   1. checks posthive-prod-{api,web}:<sha7> are loaded
#   2. refuses while a post is mid-publish (PostJob.status = 'running' would stay stuck)
#   3. stops api (worker + crons), takes a verified backup
#   4. retags :current -> :previous and <sha7> -> :current, runs prisma migrate deploy
#   5. recreates api + web, waits for health, records the deploy
#
# Rollback: README.md, "Rollback".
set -euo pipefail

ROOT=/opt/posthive
cd "$ROOT"
exec 8>"$ROOT/.deploy.lock"
flock -n 8 || { echo "another deploy is running" >&2; exit 1; }

SHA="${1:?usage: deploy.sh <git-sha>}"
[[ "$SHA" =~ ^[0-9a-f]{7,40}$ ]] || { echo "not a git sha: $SHA" >&2; exit 2; }
git -C app fetch --quiet origin
FULL="$(git -C app rev-parse --verify --quiet "$SHA^{commit}")" || { echo "unknown commit: $SHA" >&2; exit 1; }
TAG="${FULL:0:7}"

for s in api web; do
  docker image inspect "posthive-prod-$s:$TAG" > /dev/null 2>&1 \
    || { echo "image posthive-prod-$s:$TAG is not loaded; run build-and-ship.sh $FULL first" >&2; exit 1; }
done

sql() { docker compose exec -T db psql -U posthive -d posthive -Atq -c "$1"; }

echo "== db + redis"
docker compose up -d --wait db redis

if [ "$(sql "select to_regclass('public.\"PostJob\"') is not null")" = "t" ]; then
  running="$(sql "select count(*) from \"PostJob\" where status = 'running'")"
  [ "$running" = "0" ] || { echo "$running post(s) are being published right now; retry in a minute" >&2; exit 1; }
fi

previous="none"
if docker image inspect posthive-prod-api:current > /dev/null 2>&1; then
  previous="$(docker image inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' posthive-prod-api:current 2>/dev/null || true)"
  [ -n "$previous" ] || previous="$(cat "$ROOT/.current-tag" 2>/dev/null || echo unknown)"
  for s in api web; do docker tag "posthive-prod-$s:current" "posthive-prod-$s:previous"; done
fi

echo "== stop api for a consistent backup + migration"
docker compose stop api
"$ROOT/scripts/backup.sh" "pre-deploy-$TAG"

for s in api web; do docker tag "posthive-prod-$s:$TAG" "posthive-prod-$s:current"; done

echo "== migrations ($TAG)"
if ! docker compose run --rm --no-deps -T api node_modules/.bin/prisma migrate deploy; then
  echo "migration FAILED; restoring previous images and restarting the old api" >&2
  if docker image inspect posthive-prod-api:previous > /dev/null 2>&1; then
    for s in api web; do docker tag "posthive-prod-$s:previous" "posthive-prod-$s:current"; done
    docker compose up -d --no-deps --wait api || true
  fi
  echo "inspect with: docker compose run --rm --no-deps api node_modules/.bin/prisma migrate status" >&2
  exit 1
fi

echo "== start $TAG"
docker compose up -d --no-deps --force-recreate --wait --wait-timeout 240 api web

git -C app -c advice.detachedHead=false checkout --quiet --detach "$FULL"
echo "$TAG" > "$ROOT/.current-tag"
echo "$(date -u +%FT%TZ) deployed $TAG (previous: $previous)" >> "$ROOT/deploy-history.log"
docker compose ps --format 'table {{.Service}}\t{{.Status}}'
echo "deploy ok: $TAG"
