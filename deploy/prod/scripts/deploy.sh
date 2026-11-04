#!/usr/bin/env bash
# Posthive deploy on the production server (source of truth: deploy/prod/scripts/deploy.sh).
#
# Usage: deploy.sh [branch]        default: main
#
#   guard clean tree / fast-forward / no post mid-publish
#   tag the running images posthive-{api,web}:rollback-<sha>
#   fast-forward the checkout, build api + web on the server
#   stop api, take a verified pre-deploy backup
#   recreate api + web, wait for health
#   append one line to deploy-history.log
#
# Migrations run inside the api image at container start (apps/api/Dockerfile CMD).
# Rollback: README.md, "Rollback".
set -euo pipefail

ROOT="${POSTHIVE_ROOT:-/root/posthive}"
BRANCH="${1:-main}"
cd "$ROOT"

exec 8>"$ROOT/.deploy.lock"
flock -n 8 || { echo "another deploy is running" >&2; exit 1; }

API_STOPPED=0
trap '[ "$API_STOPPED" = 1 ] && echo "api is stopped; restart with: cd $ROOT && docker compose up -d api" >&2' ERR

[ "$(git symbolic-ref -q --short HEAD || true)" = "$BRANCH" ] \
  || { echo "checkout $BRANCH first (currently $(git rev-parse --short HEAD))" >&2; exit 1; }
git diff --quiet && git diff --cached --quiet \
  || { echo "tracked files are modified; commit or stash first" >&2; exit 1; }

git fetch --quiet origin "$BRANCH"
CURRENT="$(git rev-parse HEAD)"
TARGET="$(git rev-parse "origin/$BRANCH")"
if [ "$TARGET" = "$CURRENT" ]; then
  echo "already at $BRANCH ${CURRENT:0:7}; nothing to deploy"
  exit 0
fi
git merge-base --is-ancestor "$CURRENT" "$TARGET" \
  || { echo "origin/$BRANCH is not a fast-forward of ${CURRENT:0:7}; resolve manually" >&2; exit 1; }

sql() { docker compose exec -T db psql -U posthive -d posthive -Atq -c "$1"; }
if [ "$(sql "select to_regclass('public.\"PostJob\"') is not null")" = "t" ]; then
  running="$(sql "select count(*) from \"PostJob\" where status = 'running'")"
  [ "$running" = "0" ] || { echo "$running post(s) publishing right now; retry in a minute" >&2; exit 1; }
fi

# The running images stay around so a rollback can retag them (README.md, "Rollback").
PREV="${CURRENT:0:7}"
for s in api web; do
  docker image inspect "posthive-$s:latest" >/dev/null 2>&1 \
    && docker tag "posthive-$s:latest" "posthive-$s:rollback-$PREV"
done

echo "== fast-forward $BRANCH to ${TARGET:0:7}"
git merge --ff-only --quiet "$TARGET"

echo "== build api web (slow, memory-heavy: the box uses swap)"
docker compose build api web

echo "== stop api for a consistent backup"
API_STOPPED=1
docker compose stop api
"$ROOT/scripts/backup.sh" "pre-deploy-${TARGET:0:7}"

echo "== recreate api web"
docker compose up -d --no-deps --force-recreate api web
API_STOPPED=0

echo "== health"
ok=0
for _ in $(seq 1 150); do
  if curl -fsS http://127.0.0.1:3001/health >/dev/null 2>&1 \
     && curl -fsS http://127.0.0.1:3000/robots.txt >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 2
done
if [ "$ok" != 1 ]; then
  docker compose logs --tail=60 api web >&2
  echo "health check FAILED; see README.md, 'Rollback'" >&2
  exit 1
fi

echo "$(date -u +%FT%TZ) deployed ${TARGET:0:7} (previous: $PREV)" >> "$ROOT/deploy-history.log"
docker compose ps --format 'table {{.Service}}\t{{.Status}}'
echo "deploy ok: ${TARGET:0:7}"
