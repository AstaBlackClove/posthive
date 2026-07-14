# Posthive — CLAUDE.md

Social media scheduling SaaS. Schedule posts to Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook Pages, Pinterest, Telegram, Nostr, X (Twitter), Discord, Tumblr, and Lemmy from a single UI. Self-hostable, open-source (AGPL-3.0).

---

## Monorepo Structure

```
social-scheduler/
├── apps/
│   ├── api/          Fastify v4 backend (Node.js, TypeScript, ESM)
│   ├── web/          Next.js 16 frontend (App Router, TypeScript)
│   └── mcp/          MCP stdio server (Claude Code / Cursor / local agents)
├── .claude/
│   └── TASKS.md      Feature backlog and completed work
└── CLAUDE.md         This file
```

---

## Running the Project

```bash
# Both apps in parallel
pnpm dev

# Individual
pnpm dev:api      # API on http://localhost:3001
pnpm dev:web      # Web on http://localhost:3000

# Database
cd apps/api
pnpm db:studio    # Prisma Studio at http://localhost:5555
pnpm db:migrate   # Run pending migrations
```

---

## API — `apps/api`

**Stack:** Fastify v4 · Prisma 5 · SQLite (dev) / Postgres (prod) · BullMQ · Redis (Upstash) · TypeScript ESM

**Entry:** `src/index.ts` — registers CORS, routes, starts worker

### Routes
| File | Prefix | Purpose |
|------|--------|---------|
| `routes/auth.ts` | `/auth/*` | JWT login/register + Threads, Instagram, LinkedIn, YouTube, Facebook, Pinterest, Mastodon, Twitter, Discord, Tumblr OAuth + Lemmy credential connect |
| `routes/accounts.ts` | `/accounts` | List/disconnect social accounts |
| `routes/jobs.ts` | `/jobs` | CRUD + reschedule + delete scheduled posts |
| `routes/upload.ts` | `/upload` | Image/video upload → local disk or Supabase Storage |
| `routes/billing.ts` | `/billing` | Dodo Payments checkout + webhook |
| `routes/user.ts` | `/user` | Profile info + `/auth/refresh` (rate-limited 20/15 min) |
| `routes/apiKeys.ts` | `/user/api-keys` | Create / list / revoke API keys (Pro/Team) |
| `routes/publicApi.ts` | `/api/v1` | Public REST API — accounts, posts, upload, templates |
| `routes/mcp.ts` | `/mcp` | MCP Streamable HTTP server (Bearer + key-in-URL) |
| `routes/oauth.ts` | `/oauth`, `/.well-known` | OAuth 2.0 + PKCE server for Claude.ai MCP connector |
| `routes/templates.ts` | `/templates` | Post template CRUD |

### Platform Adapters — `src/adapters/`
Each adapter implements `PlatformAdapter` from `types.ts`:
- `bluesky.ts` — AT Protocol (app password auth)
- `threads.ts` — Meta Threads API (OAuth 2.0, 60-day tokens)
- `instagram.ts` — Instagram Business API (OAuth 2.0, image/carousel/reel/story publishing)
- `linkedin.ts` — LinkedIn UGC API (OAuth 2.0, text + image posts)
- `mastodon.ts` — Mastodon API (OAuth 2.0, any instance; SSRF protection on instanceUrl)
- `youtube.ts` — YouTube Data API v3 (Google OAuth 2.0, resumable video upload; type = short/video)
- `facebook.ts` — Facebook Graph API v21.0 (OAuth 2.0, page access tokens, text/photo/video/carousel)
- `pinterest.ts` — Pinterest API v5 (OAuth 2.0, Pins with image required; sandbox mode supported)
- `telegram.ts` — Telegram Bot API (bot token + channel username, no OAuth)
- `twitter.ts` — X/Twitter API v2 (OAuth 1.0a HMAC-SHA1, up to 4 images; Pro/Team only)
- `nostr.ts` — Nostr protocol (keypair auth, Kind 1 notes, NIP-92 image tags, no OAuth)
- `discord.ts` — Discord webhook API (OAuth 2.0, webhook auto-created per channel)
- `tumblr.ts` — Tumblr API v2 (OAuth 1.0a HMAC-SHA1, NPF text + image posts; tokens never expire)
- `lemmy.ts` — Lemmy API v3 (username/password → JWT per post; community posts; any instance; no OAuth)

**Register adapters in `src/adapters/index.ts`** — add to the array to enable.

### Key Libraries
- **`lib/encryption.ts`** — AES-256-GCM encrypt/decrypt for credentials. Key from `ENCRYPTION_KEY` env (64-char hex).
- **`lib/storage.ts`** — `StorageAdapter` interface. `LocalDiskStorage` (dev) or `SupabaseStorage` (prod).
- **`lib/queue.ts`** — BullMQ queue setup. `schedulePostJob(id, date)` enqueues a job.
- **`lib/worker.ts`** — BullMQ worker. Processes jobs: refresh token → create post → create comment → update status.
- **`lib/auth/`** — `localAuth.ts` (JWT, bcrypt) or `supabaseAuth.ts`. Switch via `AUTH_PROVIDER` env.
- **`lib/plans.ts`** — plan limits (account count, etc.) per billing tier.

### Job State Machine (per PostJobTarget)
```
pending → running → post_done → comment_done (= done on PostJob)
                 ↘ post_failed
                              ↘ comment_failed
```

---

## MCP — `apps/mcp`

**Stack:** TypeScript ESM · `@modelcontextprotocol/sdk` stdio transport

Standalone stdio MCP server for local agents (Claude Code, Cursor). Calls the Posthive REST API using env vars. Run with:

```bash
cd apps/mcp
POSTHIVE_API_URL=https://your-api POSTHIVE_API_KEY=ph_xxx node dist/index.js
```

All 10 tools mirror the HTTP MCP server: `list_accounts`, `create_post`, `get_post`, `list_scheduled_posts`, `approve_draft`, `update_post`, `duplicate_post`, `delete_post`, `list_templates`, `create_from_template`.

---

## Web — `apps/web`

**Stack:** Next.js 16 App Router · React 18 · Tailwind CSS · TypeScript

### Pages
| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Landing page (public) |
| `/compose` | `app/compose/page.tsx` | Compose — write post, pick accounts, schedule |
| `/jobs` | `app/jobs/page.tsx` | Posts — list + calendar view |
| `/accounts` | `app/accounts/page.tsx` | Connect/disconnect social accounts |
| `/billing` | `app/billing/page.tsx` | Plan status + upgrade |
| `/docs` | `app/docs/page.tsx` | Documentation (includes full MCP section) |
| `/mcp-connect` | `app/mcp-connect/page.tsx` | OAuth approve page for Claude.ai connector (no sidebar) |
| `/login` | `app/login/page.tsx` | Login |
| `/register` | `app/register/page.tsx` | Register |

### Key Components
- `components/Sidebar.tsx` — nav sidebar with trial banner
- `components/AppShell.tsx` — layout guard; `/mcp-connect` and `/onboarding` skip sidebar
- `components/CalendarView.tsx` — FullCalendar month/week/day with drag-to-reschedule
- `components/PlatformIcon.tsx` — favicon-based platform icons (Google S2); Telegram + Nostr use custom SVG
- `components/PlatformPreview.tsx` — per-platform post preview cards; `PLATFORM_COLOR`, `PLATFORM_LIMIT` maps
- `components/TrialBanner.tsx` — bottom-left trial countdown
- `components/DateTimePicker.tsx` — datetime input used in compose

### API Client
- `lib/api.ts` — `apiFetch()` wrapper that auto-attaches auth cookie and handles 401 refresh

---

## MCP Architecture

### HTTP MCP server (`routes/mcp.ts`)

Two routes, same `serveMcp()` handler:

| Route | Auth | Use case |
|-------|------|---------|
| `POST /mcp` | `Authorization: Bearer ph_xxx` | Claude.ai OAuth connector |
| `POST /mcp/:apiKey` | Key in URL (Fastify-redacted in logs) | Claude Code, Cursor, any HTTP client |

- Uses `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk`
- `reply.hijack()` must be called **before** `transport.handleRequest()` — order is critical
- Rate limited: 60 req/min on both routes
- Plan gate: `withMcpGate` checks `canUseApi(plan, planStatus)` — Pro/Team only

### OAuth server (`routes/oauth.ts`)

Full OAuth 2.0 Authorization Code + PKCE (RFC 7636) + Dynamic Client Registration (RFC 7591):

1. `GET /.well-known/oauth-authorization-server` — discovery metadata
2. `POST /oauth/register` — dynamic client registration; stores `redirect_uris` per client_id in memory
3. `GET /oauth/authorize` — validates `redirect_uri` against registered client, redirects to `/mcp-connect`
4. `POST /oauth/approve` — user approves in browser; stores code in `codeStore` (in-memory, 5-min TTL)
5. `POST /oauth/token` — PKCE S256 verification (plain removed); issues API key as `access_token`
6. `POST /oauth/revoke` — revokes API key by hash

**Note:** `codeStore` is in-memory — codes are lost on restart and not shared across instances. Move to Redis before horizontal scaling.

### MCP tools (all 10)

| Tool | REST call |
|------|-----------|
| `list_accounts` | `GET /api/v1/accounts` |
| `create_post` | `POST /api/v1/posts` |
| `get_post` | `GET /api/v1/posts/:id` |
| `list_scheduled_posts` | `GET /api/v1/posts` |
| `approve_draft` | `POST /api/v1/posts/:id/approve` |
| `update_post` | `PATCH /api/v1/posts/:id` |
| `duplicate_post` | `POST /api/v1/posts/:id/duplicate` |
| `delete_post` | `DELETE /api/v1/posts/:id` |
| `list_templates` | `GET /api/v1/templates` |
| `create_from_template` | `POST /api/v1/templates/:id/use` |

All MCP-created posts default to `draft: true`.

---

## Design System

**Dark theme — all inline styles:**
| Token | Value |
|-------|-------|
| Background | `#0a0a0a` |
| Surface | `#111111` |
| Border | `#2a2a2a` |
| Text | `#ededed` |
| Muted | `#888888` |
| Accent | `#5b63d3` |

**Buttons:** always `backgroundColor: "#ffffff", color: "#0a0a0a"` with `hover:bg-gray-100`

---

## Environment Variables — `apps/api/.env`

```env
PORT=3001
DATABASE_URL="file:./dev.db"
AUTH_PROVIDER=local
JWT_ACCESS_SECRET="..."        # 64-char hex
JWT_REFRESH_SECRET="..."       # 64-char hex
WEB_URL="http://localhost:3000"
ENCRYPTION_KEY="..."           # 64-char hex, never change after data written

REDIS_URL="rediss://..."       # Upstash or Railway Redis

THREADS_APP_ID="..."
THREADS_APP_SECRET="..."
THREADS_REDIRECT_URI="https://your-tunnel/auth/threads/callback"

INSTAGRAM_APP_ID="..."
INSTAGRAM_APP_SECRET="..."
INSTAGRAM_REDIRECT_URI="https://your-tunnel/auth/instagram/callback"
PUBLIC_API_URL="https://your-tunnel"   # Must be public HTTPS — Meta fetches images from here

YOUTUBE_CLIENT_ID="....apps.googleusercontent.com"
YOUTUBE_CLIENT_SECRET="..."
YOUTUBE_REDIRECT_URI="https://your-tunnel/auth/youtube/callback"

X_API_KEY="..."
X_API_SECRET="..."
X_CALLBACK_URL="https://your-tunnel/auth/twitter/callback"

DISCORD_CLIENT_ID="..."
DISCORD_CLIENT_SECRET="..."
DISCORD_BOT_TOKEN="..."
DISCORD_REDIRECT_URI="https://your-tunnel/auth/discord/callback"

TUMBLR_CONSUMER_KEY="..."
TUMBLR_CONSUMER_SECRET="..."
TUMBLR_REDIRECT_URI="https://your-tunnel/auth/tumblr/callback"
# Note: Tumblr only allows one registered callback URL — use production URL in prod

DODO_ENV="test_mode"           # or "live_mode"
DODO_API_KEY="..."
DODO_WEBHOOK_SECRET="whsec_..."
DODO_PRODUCT_CREATOR="pdt_..."
DODO_PRODUCT_PRO="pdt_..."
DODO_PRODUCT_TEAM="pdt_..."
```

**Security rules:**
- `.env` is gitignored — never commit real credentials
- Only placeholder values in `.env.example`
- `ENCRYPTION_KEY` must never change after accounts are saved (data becomes unreadable)
- OAuth redirect URIs must be tunnel URL (Meta requires public HTTPS)
- `WEB_URL` should be `localhost:3000` in dev so auth cookies stay stable across tunnel restarts

---

## Database — Prisma + SQLite

Schema at `apps/api/prisma/schema.prisma`. Compatible with Postgres — just change provider.

| Model | Purpose |
|-------|---------|
| `User` | App user. Has plan/billing fields. |
| `RefreshToken` | JWT refresh tokens. One per active session (cleaned on login). |
| `Account` | Connected social account. Credentials AES-256-GCM encrypted. |
| `PostJob` | A scheduled post. Has `content` (JSON string), status, scheduledFor. |
| `PostJobTarget` | One per platform per PostJob. Tracks per-platform status + errors. Cascades on PostJob delete. |

---

## Billing — Dodo Payments

- Plans: Creator (₹550), Pro (₹1,700), Team (₹2,600)
- SDK: `dodopayments` — use `dodo.checkoutSessions.create()` (not `payments.createPaymentLink`)
- Webhook secret: strip `whsec_` prefix before base64 decode
- Test mode: set `DODO_ENV=test_mode`

---

## Adding a New Platform

1. Create `apps/api/src/adapters/<platform>.ts` implementing `PlatformAdapter`
2. Register in `apps/api/src/adapters/index.ts`
3. Add OAuth routes in `apps/api/src/routes/auth.ts`
4. Add platform card in `apps/web/src/app/accounts/page.tsx` — also add to `PLATFORM_META` and `RECONNECT_URLS`
5. Add favicon domain in `apps/web/src/components/PlatformIcon.tsx`
6. Add `PLATFORM_COLOR` entry and `PLATFORM_LIMIT` entry in `apps/web/src/components/PlatformPreview.tsx`
7. Add preview component in `apps/web/src/components/PlatformPreview.tsx`
8. Add to `PLATFORMS_GRID` in `apps/web/src/app/page.tsx` (landing page grid + hero card)
9. Add to `PLATFORMS_NAV` in `apps/web/src/components/LandingNav.tsx`
10. Add platform data object in `apps/web/src/app/platforms/[platform]/page.tsx`
11. Add docs section in `apps/web/src/app/docs/page.tsx`
12. Add to `NO_COMMENT_PLATFORMS` in compose, EditPostDialog, and `jobRunner.ts` if the platform has no comment API
13. Add env vars to `apps/api/.env.example` and document in `README.md`
