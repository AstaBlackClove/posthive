#!/usr/bin/env bash
# Build Posthive production images on a workstation and load them on the server.
#
# Why not on the server: the API's `tsc` step loads the googleapis typings and needs ~2 GB of RAM;
# the 3 GB server cannot do that reliably next to the running stack.
#
# Usage (Git Bash / Linux / macOS, needs Docker + the `posthive` SSH alias):
#   deploy/prod/scripts/build-and-ship.sh [sha]        # default: tip of origin main
# then on the server:
#   /opt/posthive/scripts/deploy.sh <sha>
#
# Builds from a fresh LF-only clone, never from a developer working tree. Image names
# (posthive-prod-*) are distinct from the repo's own compose images (posthive-*), so a
# local stack is never affected.
set -euo pipefail

REMOTE="${POSTHIVE_SSH:-posthive}"
REPO_URL="${POSTHIVE_REPO:-https://github.com/fabhiansan/posthive.git}"
WORK="${POSTHIVE_BUILD_DIR:-$HOME/posthive-build}"

SHA="${1:-$(git ls-remote "$REPO_URL" refs/heads/main | cut -f1)}"
[[ "$SHA" =~ ^[0-9a-f]{7,40}$ ]] || { echo "not a git sha: $SHA" >&2; exit 2; }

# A new directory per run (Windows can keep an old build context locked).
SRC="$WORK/src-$(date +%Y%m%d%H%M%S)"
mkdir -p "$WORK"
git clone --quiet -c core.autocrlf=false "$REPO_URL" "$SRC"
cd "$SRC"
git -c advice.detachedHead=false checkout --quiet --detach "$SHA"
FULL="$(git rev-parse HEAD)"
TAG="${FULL:0:7}"

# Browser-facing URLs are baked into the web bundle; read them (non-secret lines only) from the server.
urls="$(ssh -o BatchMode=yes "$REMOTE" "grep -E '^(WEB_URL|PUBLIC_API_URL)=' /opt/posthive/.env")"
WEB_URL="$(printf '%s\n' "$urls" | sed -n 's/^WEB_URL=//p' | tr -d '"')"
PUBLIC_API_URL="$(printf '%s\n' "$urls" | sed -n 's/^PUBLIC_API_URL=//p' | tr -d '"')"
[ -n "$WEB_URL" ] && [ -n "$PUBLIC_API_URL" ] || { echo "WEB_URL / PUBLIC_API_URL missing in the server .env" >&2; exit 1; }
echo "building $TAG  (WEB_URL=$WEB_URL  PUBLIC_API_URL=$PUBLIC_API_URL)"

label="org.opencontainers.image.revision=$FULL"
docker build --platform linux/amd64 --label "$label" \
  -f apps/api/Dockerfile -t "posthive-prod-api:$TAG" .
docker build --platform linux/amd64 --label "$label" \
  --build-arg NEXT_PUBLIC_API_URL="$PUBLIC_API_URL" \
  --build-arg NEXT_PUBLIC_WEB_URL="$WEB_URL" \
  -f apps/web/Dockerfile -t "posthive-prod-web:$TAG" .

for s in api web; do
  docker image inspect -f "posthive-prod-$s:$TAG {{.Os}}/{{.Architecture}} {{.Size}} bytes" "posthive-prod-$s:$TAG"
done

echo "shipping to $REMOTE ..."
docker save "posthive-prod-api:$TAG" "posthive-prod-web:$TAG" | gzip -1 | ssh -o BatchMode=yes "$REMOTE" 'gunzip | docker load'
echo "loaded. Next, on the server: /opt/posthive/scripts/deploy.sh $FULL"
