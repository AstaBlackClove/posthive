# Posthive on the production server (`marketing.playmates.dev`)

Production deployment of Posthive on a single box with Docker Compose and Caddy TLS. Nothing in this
directory is used by the app itself; it is the operations layer around the unmodified repository.

Two facts drive everything below:

- **The checkout is the deployment.** `/root/posthive` is the git clone, the Compose project and the
  build context. `docker compose` must always run from there.
- **Images are built on the server.** There is no registry and no image shuttling. `scripts/deploy.sh`
  fast-forwards the checkout, builds `posthive-api` / `posthive-web`, backs up, then recreates.
  The API's `tsc` step needs ~2 GB and this box has 2.9 GB with 2.5 GB swap, so a build is slow and
  will use swap. Expect a few minutes and do not run anything else heavy at the same time.

## Layout

```
/root/posthive/                 git clone of fabhiansan/posthive (the deployment; push to main to ship)
  docker-compose.yml            tracked: db, redis, api, web (ports published on all interfaces)
  docker-compose.override.yml   server-only, gitignored: build tweaks + the Caddy service
  deploy-local/                 server-only, gitignored: Dockerfile.api, Dockerfile.web, Caddyfile
  .env                          server-only, gitignored, root:root 0600 (see "Secrets")
  scripts/backup.sh             installed copy; source of truth is deploy/prod/scripts/backup.sh
  scripts/deploy.sh             installed copy; source of truth is deploy/prod/scripts/deploy.sh
  backups/                      0700; dumps, upload archives, SHA256SUMS
  deploy-history.log            one line per successful deploy
```

The server-only files are kept in `deploy/prod/server/` in the repo for reference and disaster
recovery. They are gitignored **inside the clone** by name (`docker-compose.override.yml`,
`deploy-local/`) so `git pull` stays clean; edit them on the server, then mirror changes back here.
Runtime state created by the scripts (`backups/`, `scripts/`, `deploy-history.log`, `*.lock`) is
gitignored too, so `git status` on the server should be empty.

There is no registry and no `build-and-ship.sh` any more: the old `/opt/posthive` stack with
prebuilt `posthive-prod-*` images was replaced by this build-on-the-server setup.

| Service | Image | Network | Published | Persistent data |
|---|---|---|---|---|
| db | postgres:16-alpine | default | none | volume `posthive_postgres_data` |
| redis | redis:7-alpine | default | none | volume `posthive_redis_data` |
| api | built from `apps/api/Dockerfile` -> `posthive-api:latest` | default | 3000/3001 + 80/443 via Caddy | volume `posthive_uploads` -> `/app/apps/api/uploads` |
| web | built from `apps/web/Dockerfile` -> `posthive-web:latest` | default | as above | none |
| caddy | caddy:2-alpine | default | `0.0.0.0:80`, `0.0.0.0:443` | volumes `posthive_caddy_data`, `posthive_caddy_config` |

All containers sit on the Compose `default` network and reach each other by service name. Traffic from
the internet hits Caddy on 80/443 and is proxied: `/api/*` -> `api:3001` (prefix stripped), everything
else -> `web:3000`. The API's own 3001 and the web's 3000 are also published on `0.0.0.0` by the tracked
`docker-compose.yml`, so they are reachable directly as well; UFW allows 3000/3001. Closing them is an
open hardening item (see "Security notes"). db and redis publish no ports, but because they share
the `default` network they do have outbound internet access; the old hardened layout used a separate
`internal: true` network. Moving them back there is part of the same hardening item.

The api container is also the background worker. BullMQ consumer, all crons and the orphan-upload
cleanup run inside it, so there must be exactly one api container. Never `docker compose run api`
without an explicit command: that starts a second API with its own worker and crons. Migrations run
from the image's `CMD` (`prisma migrate deploy && node dist/index.js`) every time the container starts.

## Everyday operations (on the server)

```bash
cd /root/posthive
docker compose ps                                   # status of all 5 services
docker compose logs -f --tail=100 api               # API + worker + crons
docker compose logs --tail=100 web caddy db redis
docker compose restart api                          # restart one service
docker compose up -d                                # (re)start everything with the current images
curl -fsS http://127.0.0.1:3001/health              # API liveness (does not check DB/Redis)
curl -fsS -o /dev/null http://127.0.0.1:3000/robots.txt
docker compose exec -T db pg_isready -U posthive -d posthive
docker compose exec -T redis redis-cli ping
docker compose exec -T api node_modules/.bin/prisma migrate status
docker stats --no-stream
cat deploy-history.log
```

Public checks (these work without an SSH tunnel, unlike the old setup):

```bash
curl -fsS https://marketing.playmates.dev/                     # web
curl -fsS https://marketing.playmates.dev/api/health           # api via Caddy
```

Caddy's access log is inside the container: `docker compose exec caddy cat /data/access.log | tail`.

Never run these:
- `docker compose down -v` or `docker volume rm`. They delete the database, uploads and TLS state.
- `docker compose config` without `--quiet` or `env` inside a container. They print secrets.

## Deploying a new commit

1. Push to `main` on `fabhiansan/posthive`.
2. On the server:
   ```bash
   /root/posthive/scripts/deploy.sh
   ```
   Pass a branch name only if it is not `main`. The script:
   - refuses if tracked files are modified or the checkout is on another branch
   - refuses if `origin/main` is not a fast-forward
   - refuses while a post is mid-publish (`PostJob.status = 'running'` would stay stuck)
   - tags the running images `posthive-{api,web}:rollback-<sha>` (keeps rollback cheap)
   - fast-forwards the checkout, then `docker compose build api web`
   - stops api, runs `scripts/backup.sh pre-deploy-<sha>`
   - recreates api + web, waits up to 5 minutes for both health checks
   - appends a line to `deploy-history.log`
3. Watch the api logs for the first minutes: `docker compose logs -f --tail=100 api`.

A build takes several minutes on this box. If it fails, nothing has been recreated yet: the old
containers keep serving whatever is in `git` at that moment, so `git reset --hard <old sha>` restores
the tree. If you need to change `WEB_URL` or `PUBLIC_API_URL`, edit `.env` first; `NEXT_PUBLIC_*` is
baked into the web build, so the next deploy picks it up.

## Rollback

The checkout is the deployment, so rolling back means moving the checkout back and rebuilding.
Images are not versioned in a registry, and `apps/api/Dockerfile` runs `prisma migrate deploy` on every
start, so a rollback never needs a migration step of its own.

```bash
cd /root/posthive
git log --oneline -5                  # find the last good commit
git reset --hard <old-sha>            # local only; nothing is pushed
docker compose build api web
docker compose up -d --no-deps --force-recreate api web
```

If the bad deploy is still the running one, the pre-deploy images are tagged
`posthive-{api,web}:rollback-<previous-sha7>`. Retagging them is faster than a rebuild:

```bash
cd /root/posthive
git reset --hard <old-sha>            # reset first so the tree matches the images
for s in api web; do docker tag posthive-$s:rollback-<old-sha7> posthive-$s:latest; done
docker compose up -d --no-deps --force-recreate api web
```

If the failed release ran a migration the old code cannot read, also restore the pre-deploy dump.
**This overwrites current data; get approval first.**
```bash
docker compose stop api
docker compose exec -T db pg_restore -U posthive -d posthive --clean --if-exists --no-owner \
  < backups/posthive-<timestamp>-pre-deploy-<sha7>.dump
docker compose up -d api
```

## Backups

- `posthive-backup.timer` runs `scripts/backup.sh daily` at 03:17 UTC (`Persistent=true`). It is
  installed in `/etc/systemd/system`; the source of truth is `deploy/prod/systemd/`.
  ```bash
  systemctl list-timers posthive-backup.timer
  journalctl -u posthive-backup.service -n 50 --no-pager
  ```
- Every run:
  - writes `pg_dump -Fc` to a temp file and keeps it only if `pg_restore --list` reads a non-zero
    number of TOC entries
  - archives the `posthive_uploads` volume
  - appends checksums to `backups/SHA256SUMS`
- Retention: 14 days of `daily`, the 10 most recent `pre-deploy-*`. Manual and pre-migrate backups are
  kept until deleted by hand.
- Manual backup: `/root/posthive/scripts/backup.sh manual`.
- Restore test into a scratch database (safe, does not touch `posthive`):
  ```bash
  cd /root/posthive; f=$(ls -1t backups/*.dump | head -1)
  docker compose exec -T db createdb -U posthive restore_check
  docker compose exec -T db pg_restore -U posthive -d restore_check --no-owner < "$f"
  docker compose exec -T db psql -U posthive -d restore_check -Atc "select count(*) from information_schema.tables where table_schema='public'"
  docker compose exec -T db dropdb -U posthive restore_check
  ```
- **Backups are on the same disk as the database.** Copy them off the box regularly:
  `scp posthive:/root/posthive/backups/<file> .`. Nothing alerts if a backup fails; check the journal
  after a deploy and periodically.
- A dump is useless for connected accounts without the matching `ENCRYPTION_KEY`. Keep an offline copy
  of the key, e.g. in a password manager.
- The one-off migration dump from 2026-11-02 sits at `/root/posthive-db-20261102T225339Z.dump`
  (outside `backups/`, so retention never touches it). Move or copy it somewhere safe.

## Secrets

`/root/posthive/.env` is gitignored, root:root 0600, and holds:
- `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_PIN`, `ADMIN_EMAIL`.
  Generate with `openssl rand -hex 32`, except the email.
- `ENCRYPTION_KEY`: copied from the previous deployment. **Never change it.** Every stored OAuth
  credential is AES-256-GCM encrypted with it.
- URLs: `WEB_URL=https://marketing.playmates.dev`,
  `PUBLIC_API_URL=https://marketing.playmates.dev/api` (Caddy strips `/api`).
- `AUTH_PROVIDER=local`, `STORAGE_PROVIDER=local`, `TZ=UTC`.
- Platform credentials that are actually set: `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`,
  `INSTAGRAM_REDIRECT_URI`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`,
  `LINKEDIN_REDIRECT_URI`. The API crashes at import if `INSTAGRAM_APP_*` are undefined, even empty.
- `SECURE_COOKIES=false` is redundant here: the container runs with `NODE_ENV=production`, which
  already forces `Secure` cookies. Keep it `false` only if you must test over plain HTTP somewhere
  that is not production.

Changing a variable: edit `.env`, then `docker compose up -d api` (add `--force-recreate api` if only
the env changed). `POSTGRES_PASSWORD` only applies when the database volume is first created; to rotate
it, run `ALTER USER` in Postgres first.

## Security notes

- **Firewall:** UFW is on with 22, 80, 443, **3000 and 3001** allowed. Docker publishes ports
  directly, bypassing UFW, so the tracked compose file is what actually exposes 3000/3001 on all
  interfaces. Hardening step (not done): bind them to `127.0.0.1`, or drop the `ports:` entries and
  reach the services only through Caddy. Do it in `docker-compose.yml` (tracked) or the override.
- **TLS:** Caddy obtains and renews certificates for `marketing.playmates.dev` automatically; state
  lives in `posthive_caddy_data`. Losing that volume just means a re-issue.
- **Docker API:** reachable only through `/var/run/docker.sock` (no TCP listener).
- **Logs are sensitive.** The API logs request URLs, which can include the `?token=<JWT>` of the live
  job stream. Without `RESEND_API_KEY` it also prints email-verification and password-reset links.
  Don't paste raw logs anywhere.
- **Admin endpoints:** `/admin/run-cleanup`, `/admin/run-drip` and `/admin/sync-stats` require
  `Authorization: Bearer $ADMIN_PIN`. They are open when `ADMIN_PIN` is empty, so never leave it empty.
- **No reverse-proxy awareness:** Fastify has no `trustProxy`, so behind Caddy every client looks like
  the proxy IP for rate limiting. The rate-limit key also looks for a cookie named `access_token` while
  the real one is `ss-access-token`. Fix before real public traffic.

## Preserved problems in the app (not deployment)

These are code-level and tracked here so nobody mistakes them for ops issues:

- SIGTERM only disconnects Prisma; it does not close the BullMQ worker, so a post interrupted
  mid-publish can stay `running` forever, which then blocks `deploy.sh` until it is reset by hand.
  Inspect first, then reset deliberately:
  ```bash
  docker compose exec -T db psql -U posthive -d posthive -c \
    "select id, \"scheduledFor\" from \"PostJob\" where status = 'running'"
  # then, for those ids only (a write):
  docker compose exec -T db psql -U posthive -d posthive -c \
    "update \"PostJob\" set status = 'failed' where status = 'running'"
  ```
- `routes/auth.ts` crashes when `INSTAGRAM_APP_*` are undefined.
- Rate-limit key/cookie mismatch and missing `trustProxy` (see "Security notes").

## If you rebuild the server from scratch

1. `git clone https://github.com/fabhiansan/posthive.git /root/posthive`
2. Install the server-only files: `docker-compose.override.yml`, `deploy-local/Dockerfile.api`,
   `deploy-local/Dockerfile.web`, `deploy-local/Caddyfile` from `deploy/prod/server/`, plus `.env`
   from `deploy/prod/env.example`.
3. Create the uploads volume **before** the first `up`, owned by the app user (uid 100):
   `docker volume create posthive_uploads`
4. `cd /root/posthive && docker compose build api web && docker compose up -d`
5. Install the backup unit:
   ```bash
   install -m 0755 deploy/prod/scripts/backup.sh /root/posthive/scripts/backup.sh
   install -m 0755 deploy/prod/scripts/deploy.sh  /root/posthive/scripts/deploy.sh
   install -m 0644 deploy/prod/systemd/posthive-backup.service \
                   deploy/prod/systemd/posthive-backup.timer /etc/systemd/system/
   systemctl daemon-reload && systemctl enable --now posthive-backup.timer
   ```
6. Verify: `systemctl start posthive-backup.service && journalctl -u posthive-backup.service -n 20`.
