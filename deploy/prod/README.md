# Posthive on the production server (`<server-hostname>`)

Production deployment of Posthive with Docker Compose. There is no domain yet, so the stack is only
reachable through an SSH tunnel. Nothing in this directory is used by the app itself. It is the
operations layer around the unmodified repository.

## Layout

```
/opt/posthive/                 root:root 0750
  app/                         git clone of fabhiansan/posthive, detached at the deployed commit (never edited)
  compose.yaml                 the stack (copy of deploy/prod/compose.yaml); never builds
  .env                         secrets, root:root 0600; generated on the server (see "Secrets")
  env.example                  variable names only
  scripts/backup.sh            verified pg_dump + uploads archive
  scripts/deploy.sh            switch to new images: backup -> migrate -> recreate -> health
  systemd/                     source of the backup unit + timer (installed in /etc/systemd/system)
  backups/                     0700; dumps, upload archives, SHA256SUMS
  deploy-history.log           one line per deploy
```

| Service | Image | Network | Published | Persistent data |
|---|---|---|---|---|
| db | postgres:16-alpine | backend (internal) | none | volume `posthive-prod_postgres_data` |
| redis | redis:7-alpine (AOF on, noeviction) | backend (internal) | none | volume `posthive-prod_redis_data` |
| api | posthive-prod-api:current | backend + default | 127.0.0.1:3001 | volume `posthive-prod_uploads` -> `/app/apps/api/uploads` |
| web | posthive-prod-web:current | default | 127.0.0.1:3000 | none |

The api container is also the background worker. BullMQ consumer, all crons and the orphan-upload
cleanup run inside it, so there must be exactly one api container. Never `docker compose run api` without an
explicit command: that starts a second API with its own worker and crons.

Always run `docker compose` from `/opt/posthive`. The repo's own `app/docker-compose.yml` is
not server-safe (it publishes 3000/3001 on all interfaces). The project name here, `posthive-prod`, is
deliberately different so that file can never take over these containers.

## Access (SSH tunnel)

```bash
ssh -N -o ExitOnForwardFailure=yes -L 3000:127.0.0.1:3000 -L 3001:127.0.0.1:3001 posthive
```

Then open http://localhost:3000 in Chrome or Firefox. Some details:
- The local ports must be exactly 3000 and 3001: the API URL `http://localhost:3001` is baked into the web build, and CORS allows `http://localhost:3000`.
- Stop any local `pnpm dev` first. Cookies are not port-scoped, and the ports would clash.
- Auth cookies are `Secure`. Chrome and Firefox accept them on `http://localhost`; Safari may not.

## Everyday operations (on the server)

```bash
cd /opt/posthive
docker compose ps                                   # status + health of all 4 services
docker compose logs -f --tail=100 api               # API + worker + crons (treat as sensitive, see below)
docker compose logs --tail=100 web db redis
docker compose restart api                          # restart one service
docker compose up -d                                # (re)start everything with the current images
curl -fsS http://127.0.0.1:3001/health              # API liveness (does not check DB/Redis)
docker compose exec -T db pg_isready -h 127.0.0.1 -U posthive -d posthive
docker compose exec -T redis redis-cli ping
docker compose run --rm --no-deps api node_modules/.bin/prisma migrate status
docker stats --no-stream
cat deploy-history.log
```

Never run these:
- `docker compose down -v` or `docker volume rm`. They delete the database and uploads.
- `docker compose config` without `--quiet`, `docker inspect` without `-f`, or `env` inside a container. They print secrets.

## Updating to a new commit

Images are built on a workstation, not on the server. The API's `tsc` step loads the googleapis typings
and needs ~2 GB of RAM, measured with `tsc --extendedDiagnostics`.

1. On the workstation (Git Bash, Docker, the `posthive` SSH alias), from the repo root:
   ```bash
   POSTHIVE_BUILD_DIR=/d/posthive-build deploy/prod/scripts/build-and-ship.sh <sha>    # default: tip of main
   ```
   This makes a fresh LF-only clone and builds `posthive-prod-api:<sha7>` and `posthive-prod-web:<sha7>`. The web
   image gets `WEB_URL`/`PUBLIC_API_URL` from the server `.env`. The script then streams both images to the server
   (about 0.5 GB gzip). It never touches a local `posthive-*` stack.
2. On the server:
   ```bash
   /opt/posthive/scripts/deploy.sh <sha>
   ```
   The script:
   - refuses if a post is mid-publish (status `running`)
   - stops api
   - takes a verified `pre-deploy-<sha7>` backup
   - tags the old images `:previous`
   - runs `prisma migrate deploy` from the new image
   - recreates api + web and waits for them to be healthy
   - records the deploy in `deploy-history.log`

Changing `WEB_URL` or `PUBLIC_API_URL` always needs a new web build (step 1), because `NEXT_PUBLIC_*` is baked in.

## Rollback

Code only, when the failed deploy did not change the schema in an incompatible way:
```bash
cd /opt/posthive
for s in api web; do docker tag posthive-prod-$s:previous posthive-prod-$s:current; done
docker compose up -d --no-deps --force-recreate --wait api web
```
If the new release ran a migration the old code cannot handle, also restore the pre-deploy dump.
**This overwrites current data; get approval first.**
```bash
docker compose stop api
docker compose exec -T db pg_restore -U posthive -d posthive --clean --if-exists --no-owner \
  < backups/posthive-<timestamp>-pre-deploy-<sha7>.dump
docker compose up -d --wait api
```

## Backups

- `posthive-backup.timer` runs `scripts/backup.sh daily` at 03:17 UTC (`Persistent=true`). Check it with
  `systemctl list-timers posthive-backup.timer` and `journalctl -u posthive-backup.service`.
- Every run does the following:
  - writes `pg_dump -Fc` to a temp file and keeps it only if `pg_restore --list` can read it
  - archives the uploads volume
  - appends checksums to `backups/SHA256SUMS`
- Retention: daily backups are kept for 14 days and the 10 most recent pre-deploy backups are kept.
  Pre-migrate and manual backups are kept until removed by hand.
- Manual backup: `/opt/posthive/scripts/backup.sh manual`.
- Restore test into a scratch database (safe, does not touch `posthive`):
  ```bash
  cd /opt/posthive; f=$(ls -1t backups/*.dump | head -1)
  docker compose exec -T db createdb -U posthive restore_check
  docker compose exec -T db pg_restore -U posthive -d restore_check --no-owner < "$f"
  docker compose exec -T db psql -U posthive -d restore_check -Atc "select count(*) from information_schema.tables where table_schema='public'"
  docker compose exec -T db dropdb -U posthive restore_check
  ```
- **Backups are on the same disk as the database.** Copy them off the server regularly, e.g. pull them from a
  workstation with `scp posthive:/opt/posthive/backups/<file> .`. Nothing alerts if a backup fails, so check the journal.
- A dump is useless for connected accounts without the matching `ENCRYPTION_KEY`. Keep an offline copy of
  the key, e.g. in a password manager.

## Secrets

`/opt/posthive/.env` (root:root 0600) holds:
- `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_PIN`: generated on the server with `openssl rand -hex 32`.
- `ENCRYPTION_KEY`: copied from the previous (laptop) deployment, verified by sha256 fingerprint only.
  **Never change it.** Every stored OAuth credential is AES-256-GCM encrypted with it.
- Non-secret settings: the URLs, `AUTH_PROVIDER=local`, `STORAGE_PROVIDER=local`, and empty `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET`.
  The API crashes at import if those two are undefined.

Changing a variable: edit with `nano .env`, then `docker compose up -d api`. Use `--force-recreate` if only the
env changed. `POSTGRES_PASSWORD` only applies when the database volume is first created; to rotate it, change it in
Postgres with `ALTER USER` first.

## Security notes

- **Firewall:** UFW is on (deny incoming, allow 22/tcp). Docker-published ports bypass UFW, which is why every
  published port in `compose.yaml` is bound to `127.0.0.1`. Keep it that way until a reverse proxy exists.
- **Internal network:** db and redis are only on the internal `backend` network, with no ports and no internet access.
- **Docker API:** reachable only through `/var/run/docker.sock` (no TCP listener).
- **Logs are sensitive.** The API logs request URLs, which include the `?token=<JWT>` of the live job stream. Without
  `RESEND_API_KEY` it also prints email-verification and password-reset links. Don't paste raw logs anywhere.
- **Admin endpoints:** `/admin/run-cleanup`, `/admin/run-drip` and `/admin/sync-stats` require
  `Authorization: Bearer $ADMIN_PIN`. They are open if `ADMIN_PIN` is empty, so never leave it empty.

## Limitations until a domain + HTTPS exist

- **OAuth:** no OAuth platform connections. Callback URLs need public HTTPS, so all `*_REDIRECT_URI` values are unset.
- **Media publishing:** Instagram, Facebook video, Threads, Pinterest, YouTube and Tumblr cannot publish locally stored
  media. Those platforms fetch it from `PUBLIC_API_URL`, which is `http://localhost:3001` for now.
- **Email:** no email is sent; links appear in the API logs.
- **Rate limits:** all tunnel traffic shares one rate-limit bucket. For example, login allows 10 attempts per 15 minutes in total.
- **Avatar URLs:** avatars are stored with absolute `http://localhost:3001/uploads/...` URLs and need rewriting after the switch.

## Adding a domain later (not done yet)

Follow the repo's documented layout: two hostnames on one registrable domain, `<domain>` for web and
`api.<domain>` for the API. They are same-site, so the `SameSite=Lax` auth cookies keep working.
Alternative: one hostname, with Caddy proxying `/backend/*` to the API (the layout the laptop stack uses).

1. **DNS:** `A <domain>` and `A api.<domain>` → `<SERVER_IP>`. Add `AAAA` →
   `<SERVER_IPV6>` only if IPv6 ingress is wanted.
2. **Caddy:** add a service to `compose.yaml` on the `default` network:
   ```yaml
   caddy:
     image: caddy:2-alpine
     restart: unless-stopped
     ports: ["80:80", "443:443", "443:443/udp"]
     volumes: ["./Caddyfile:/etc/caddy/Caddyfile:ro", "caddy_data:/data", "caddy_config:/config"]
     networks: [default]
     depends_on: [api, web]
   ```
   `Caddyfile`. Caddy obtains certificates and redirects HTTP to HTTPS automatically:
   ```
   <domain> {
       reverse_proxy web:3000
   }
   api.<domain> {
       request_body max_size 110MB
       reverse_proxy api:3001 {
           flush_interval -1    # job status stream is Server-Sent Events
       }
   }
   ```
   Add `caddy_data:` and `caddy_config:` under `volumes:`. Optionally keep the `127.0.0.1` ports for tunnel access.
3. **Firewall:** `ufw allow 80/tcp`, `ufw allow 443/tcp`, `ufw allow 443/udp`. Docker publishing is what actually
   exposes the ports, since it bypasses UFW; the rules document intent.
4. **`.env`:** set `WEB_URL=https://<domain>` and `PUBLIC_API_URL=https://api.<domain>`, then run
   `build-and-ship.sh` and `deploy.sh`. The web image must be rebuilt with the new URLs.
5. **OAuth:** set each platform's credentials plus its callback, e.g.
   `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_REDIRECT_URI=https://api.<domain>/auth/instagram/callback`.
   Other variable names are in `app/apps/api/.env.example` (`*_REDIRECT_URI`, `X_CALLBACK_URL`). Register the exact
   same URLs in each provider console.
6. **Meta / Instagram app settings:**
   - App Domains: `<domain>`
   - Valid OAuth Redirect URIs: the Instagram callback above
   - Privacy Policy URL: `https://<domain>/privacy`
   - Terms of Service URL: `https://<domain>/terms`
   - User data deletion: there is no deletion callback in the API, so use the instructions URL
     `https://<domain>/privacy` (it has a deletion section)
   - Meta must be able to fetch media from `https://api.<domain>/uploads/...`
7. **Email:** `RESEND_API_KEY` and `EMAIL_FROM` on a domain verified in Resend.
8. **Code changes for the mentor, needed before real public traffic:**
   - Fastify has no `trustProxy`, so behind Caddy every client gets the proxy's IP for rate limiting.
   - The rate-limit key looks for a cookie named `access_token`, but the real one is `ss-access-token`.
   - The SSE `?token=` query string is logged in request URLs.
   - SIGTERM does not close the BullMQ worker, so a post interrupted mid-publish stays `running` forever.
   - `routes/auth.ts` crashes when `INSTAGRAM_APP_*` are undefined.

## Cutover from the laptop stack (later, needs approval)

The laptop stack (behind Cloudflare Tunnel) still holds the real data: N users, N posts and N Instagram accounts.
This server shares its `ENCRYPTION_KEY`, so the data can move without reconnecting accounts.

1. Pick a quiet time. On the laptop, stop the api so crons and publishing stop:
   `docker compose -f docker-compose.local.yml stop api`.
2. On the laptop, take a final dump:
   `docker compose -f docker-compose.local.yml exec -T db pg_dump -U posthive -d posthive -Fc > final.dump`.
   Copy it with `scp final.dump posthive:/opt/posthive/backups/`.
3. On the server:
   - `scripts/backup.sh pre-cutover`
   - `docker compose stop api`
   - **(destructive, approval needed)** replace the database: `pg_restore --clean --if-exists --no-owner -d posthive`
   - `prisma migrate status`
   - Verify row counts: `User` 7, `PostJob` 70, `Account` 2, `Template` 1.
   - Start api and confirm an Instagram credential decrypts (token-refresh cron logs).
4. Rewrite the absolute avatar URLs (`Account.avatarUrl`, user avatars) from the old host to `PUBLIC_API_URL`.
5. Copy the uploads (empty on the laptop as of 2026-11-02), switch DNS, then retire the laptop `cloudflared`.
