<p align="center">
  <img src="apps/web/public/posthivemain.png" alt="Posthive" width="180" />
</p>

<h1 align="center">Posthive</h1>

<p align="center">
  Schedule posts to Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook Pages, Pinterest, X (Twitter), Telegram, and Nostr from a single UI.<br/>
  Self-hostable · Open-source · AGPL-3.0
</p>

<p align="center">
  <a href="https://github.com/AstaBlackClove/posthive/blob/main/LICENSE"><img alt="License: AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" /></a>
  <a href="https://github.com/AstaBlackClove/posthive"><img alt="GitHub Repo" src="https://img.shields.io/badge/github-AstaBlackClove%2Fposthive-181717?logo=github" /></a>
</p>

---

## Features

**Scheduling**
- **Multi-platform posting** - write once, publish to all 11 platforms simultaneously
- **Bulk CSV scheduling** - upload a spreadsheet to schedule hundreds of posts; per-row platform exclusions (`!instagram`)
- **Post templates** - save, load, and delete reusable post drafts
- **Dry run mode** - full pipeline test without making real API calls
- **First comment scheduling** - auto-reply immediately after the main post goes live
- **Per-platform overrides** - custom text and first comment per account (Pro+)

**AI & Agents**
- **MCP server** - connect Claude, ChatGPT, Cursor, VS Code, Claude Code, Codex, OpenClaw, Hermes Agent, or any MCP-compatible agent via one bare URL
- **OAuth 2.0 + PKCE** - full dynamic client registration flow; no API key to paste for any client — the agent opens your browser to sign in
- **`posthive-cli`** - shell CLI (`npx posthive-cli`) with `login`/`logout`/`whoami`, mirrors the full public API, ships a bundled `SKILL.md` for agent self-discovery
- **`posthive-mcp`** - standalone MCP server package (`npx posthive-mcp`); shares the same login as `posthive-cli` via `~/.posthive/config.json`
- **10 MCP tools** - list accounts, create/get/update/delete posts, approve drafts, duplicate, list/use templates
- **Media type support** - Instagram media type (post/reel/story) and YouTube type (short/video) via MCP
- **Draft-first** - every agent-created post lands as a draft for human review unless scheduling is explicitly requested
- **Plan-gated** - MCP/API access requires Pro or Team plan (self-hosted with billing disabled: unlimited)

**Media**
- Images (up to 4 per post; plan-gated), video (up to 100 MB)
- Instagram Reels, Stories, and carousel (up to 10 items)
- YouTube Shorts + long-form video with dedicated Title/Description fields
- Pinterest Pins with dedicated Title/Description fields image required
- Alt text on every image
- Clipboard paste and drag-and-drop upload

**Calendar & Posts**
- FullCalendar month/week/day views with drag-to-reschedule
- Real-time job status via Server-Sent Events
- Platform filter in list and calendar views
- Retry failed platforms (re-queues only failed targets; skips already-successful ones)
- Inline edit and reschedule from list view

**Auth & Accounts**
- Email + password auth (JWT, bcrypt, silent refresh)
- Email verification and password reset via Resend
- API keys for programmatic access (Pro/Team plans)
- Token expiry warnings with one-click reconnect
- Background token auto-refresh (Threads, Instagram, Facebook, YouTube every 12h)

**Infrastructure**
- BullMQ queue backed by Redis (Upstash or Railway)
- AES-256-GCM encryption for all stored OAuth credentials
- Sentry error monitoring
- Orphan upload cleanup cron (every 6h)
- Rate limiting per route
- CSRF nonce on all OAuth flows

**Billing (optional)**
- Dodo Payments - Creator, Pro, Team plans
- 14-day free trial; INR/USD currency detection
- Set `ENABLE_BILLING=false` for self-hosted mode all features unlocked, no plan limits

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 18, Tailwind CSS |
| Backend | Fastify v4, TypeScript ESM, Node.js |
| Database | Prisma 5 - Postgres (dev via Docker or local install) / Postgres (prod) |
| Queue | BullMQ 5 + Redis (Upstash or Railway) |
| Email | Resend |
| Storage | Local disk (dev) / Supabase Storage (prod) |
| Billing | Dodo Payments |
| Monitoring | Sentry |
| Calendar | FullCalendar 6 |

---

## Project Structure

```
posthive/
├── apps/
│   ├── api/                  # Fastify v4 API (Node.js, TypeScript, ESM)
│   │   ├── prisma/           # Schema + migrations
│   │   └── src/
│   │       ├── adapters/     # Platform adapters (Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook, Pinterest, X/Twitter, Telegram, Nostr)
│   │       ├── lib/          # Auth, queue, worker, encryption, storage, mailer, plans
│   │       └── routes/       # auth, accounts, jobs, templates, upload, billing, user, apiKeys, publicApi, mcp, oauth
│   ├── web/                  # Next.js 16 frontend
│   │   └── src/
│   │       ├── app/          # Pages: compose, jobs, accounts, billing, settings, docs, agent, features, platforms
│   │       └── components/   # Sidebar, CalendarView, BulkScheduleModal, Toast, PlatformPreview, AgentSetupTabs, etc.
│   ├── cli/                  # posthive-cli — npm-published shell CLI (login/logout/whoami + full API)
│   └── mcp/                  # posthive-mcp — npm-published standalone MCP server
└── package.json              # pnpm workspace root
```

---

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 - `npm install -g pnpm`
- **Redis** - [Upstash](https://upstash.com) free tier or Railway Redis
- **Postgres** - [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended, zero config `pnpm dev:db` pulls `postgres:15` automatically on first run) or a local Postgres install

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/AstaBlackClove/posthive.git
cd posthive
pnpm install
```

### 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
```

Fill in the values see [Environment Variables](#environment-variables) below.

### 3. Database

**Option A - Docker (recommended, no Postgres install needed)**

```bash
# Start a Postgres container (creates it on first run, starts it on subsequent runs)
pnpm dev:db
```

Use this `DATABASE_URL` in `apps/api/.env`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

The container is named `posthive-pg`. Stop it with `pnpm db:stop`, restart with `pnpm db:start`.

**Option B - SQLite (no Docker, quickest setup)**

Change the provider in `apps/api/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

Use this `DATABASE_URL` in `apps/api/.env`:
```
DATABASE_URL="file:./dev.db"
```

> SQLite is fine for local development and self-hosting on a single server. Use Postgres in production for reliability and concurrent writes.

### 4. Run migrations

```bash
cd apps/api
pnpm db:migrate
```

### 5. Run dev servers

```bash
# from project root starts Docker Postgres + API + Web in parallel
pnpm dev
```

> If you chose SQLite (Option B), skip `pnpm dev:db` just run `pnpm dev:api` and `pnpm dev:web` separately, or use `pnpm dev` after commenting out the `dev:db` step.

| Service | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:3001 |
| Prisma Studio | `pnpm db:studio` → http://localhost:5555 |

---

## Environment Variables

### `apps/api/.env`

**Core**

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | API port. Defaults to `3001` |
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@localhost:5432/postgres` (Docker dev) or `file:./dev.db` (SQLite dev) or Postgres URL in prod |
| `ENCRYPTION_KEY` | Yes | 64-char hex. AES-256-GCM key for credentials. **Never change after data is written** |
| `REDIS_URL` | Yes | Upstash or Railway Redis URL |
| `WEB_URL` | Yes | Frontend origin for CORS + OAuth redirects. `http://localhost:3000` in dev |
| `NODE_ENV` | Prod | Set to `production` |
| `SECURE_COOKIES` | Prod | Set to `true` to require HTTPS for auth cookies |

**Auth**

| Variable | Required | Description |
|---|---|---|
| `AUTH_PROVIDER` | No | `local` (default) or `supabase` |
| `JWT_ACCESS_SECRET` | local auth | 64-char hex |
| `JWT_REFRESH_SECRET` | local auth | 64-char hex |
| `SUPABASE_URL` | Supabase | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Supabase service role key |

**Email**

| Variable | Required | Description |
|---|---|---|
| `RESEND_API_KEY` | No | [Resend](https://resend.com) API key. Falls back to console in dev |
| `EMAIL_FROM` | No | Verified sender address. e.g. `Posthive <noreply@posthive.co>` |

**Storage**

| Variable | Required | Description |
|---|---|---|
| `STORAGE_PROVIDER` | No | `supabase` for prod; unset = local disk |
| `SUPABASE_STORAGE_BUCKET` | Supabase | Bucket name. Defaults to `media` |
| `PUBLIC_API_URL` | Instagram | Public HTTPS URL of the API Meta fetches images from here |

**OAuth - Threads**

| Variable | Description |
|---|---|
| `THREADS_APP_ID` | Meta app ID |
| `THREADS_APP_SECRET` | Meta app secret |
| `THREADS_REDIRECT_URI` | Must be public HTTPS |

**OAuth - Instagram**

| Variable | Description |
|---|---|
| `INSTAGRAM_APP_ID` | Meta app ID |
| `INSTAGRAM_APP_SECRET` | Meta app secret |
| `INSTAGRAM_REDIRECT_URI` | Must be public HTTPS |

**OAuth - LinkedIn**

| Variable | Description |
|---|---|
| `LINKEDIN_CLIENT_ID` | LinkedIn app client ID |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn app client secret |
| `LINKEDIN_REDIRECT_URI` | Must be public HTTPS |

**OAuth - Mastodon**

| Variable | Description |
|---|---|
| `MASTODON_CLIENT_ID` | Client key from Mastodon app settings |
| `MASTODON_CLIENT_SECRET` | Client secret from Mastodon app settings |
| `MASTODON_REDIRECT_URI` | Must be public HTTPS |

**OAuth - YouTube**

| Variable | Description |
|---|---|
| `YOUTUBE_CLIENT_ID` | Google OAuth client ID |
| `YOUTUBE_CLIENT_SECRET` | Google OAuth client secret |
| `YOUTUBE_REDIRECT_URI` | Use `http://localhost:3001/auth/youtube/callback` Google rejects tunnel domains; localhost is exempt |

**OAuth - Facebook Pages**

| Variable | Description |
|---|---|
| `FACEBOOK_APP_ID` | Meta app ID |
| `FACEBOOK_APP_SECRET` | Meta app secret |
| `FACEBOOK_REDIRECT_URI` | Must be public HTTPS |

**OAuth - Pinterest**

| Variable | Description |
|---|---|
| `PINTEREST_CLIENT_ID` | Pinterest App ID from developers.pinterest.com |
| `PINTEREST_CLIENT_SECRET` | Pinterest App secret key |
| `PINTEREST_REDIRECT_URI` | Must be public HTTPS |
| `PINTEREST_SANDBOX` | Set `true` while app has Trial access routes API calls to the sandbox |
| `PINTEREST_SANDBOX_TOKEN` | Manually-generated sandbox token (My Apps → Generate Access Token → Sandbox). Only used when `PINTEREST_SANDBOX=true` |

> Pinterest requires **Standard access** approval for production pin creation. Apply at developers.pinterest.com → My Apps → Request upgraded access. Until approved, set `PINTEREST_SANDBOX=true` and use a sandbox token.

**OAuth - X (Twitter)**

| Variable | Description |
|---|---|
| `X_API_KEY` | API Key (Consumer Key) from developer.x.com |
| `X_API_SECRET` | API Key Secret (Consumer Secret) |
| `X_CALLBACK_URL` | Must be public HTTPS — OAuth 1.0a callback URL |

> Uses OAuth 1.0a (not 2.0). Requires Pro or Team plan when billing is enabled.

**Billing**

| Variable | Required | Description |
|---|---|---|
| `ENABLE_BILLING` | No | Set to `true` to enable Dodo Payments and plan limits |
| `DODO_ENV` | Billing | `test_mode` or `live_mode` |
| `DODO_API_KEY` | Billing | Dodo API key |
| `DODO_WEBHOOK_SECRET` | Billing | `whsec_...` webhook signing secret |
| `DODO_PRODUCT_CREATOR` | Billing | Dodo product ID for Creator plan |
| `DODO_PRODUCT_PRO` | Billing | Dodo product ID for Pro plan |
| `DODO_PRODUCT_TEAM` | Billing | Dodo product ID for Team plan |

**Monitoring**

| Variable | Required | Description |
|---|---|---|
| `SENTRY_DSN` | No | Sentry DSN. Omit to disable |

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### `apps/web/.env.local`

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | API URL from the browser. `http://localhost:3001` in dev |
| `NEXT_PUBLIC_WEB_URL` | Yes | Public URL of the web app. Used for OG images, sitemap, robots.txt. `http://localhost:3000` in dev, `https://yourdomain.com` in prod |
| `NEXT_PUBLIC_ENABLE_BILLING` | No | Must match `ENABLE_BILLING` in the API |

---

## Connecting Platforms

### Bluesky
1. Go to **Accounts** in the app
2. Enter your handle (e.g. `you.bsky.social`)
3. Generate an app password at [bsky.app](https://bsky.app) → Settings → App Passwords
4. Enter it and click Connect no OAuth needed

### Threads
1. Create an app at [developers.facebook.com](https://developers.facebook.com) and add the Threads use case
2. Set the OAuth redirect URI to `https://your-domain/auth/threads/callback`
3. Add `THREADS_APP_ID` and `THREADS_APP_SECRET` to `.env`

> In development mode only Threads Testers can connect. Submit for Meta App Review (`threads_basic` + `threads_content_publish`) for public access.

### Instagram
1. Add the Instagram product to your Meta app
2. Set the OAuth redirect URI to `https://your-domain/auth/instagram/callback`
3. Requires a **Professional** (Business or Creator) Instagram account

### LinkedIn
1. Create an app at [developer.linkedin.com](https://developer.linkedin.com)
2. Add the **Share on LinkedIn** and **Sign In with LinkedIn using OpenID Connect** products
3. Set redirect URI to `https://your-domain/auth/linkedin/callback`

### Mastodon
1. Log in to your Mastodon instance → Settings → Development → New Application
2. Scopes: `read:accounts`, `write:statuses`, `write:media`
3. Set redirect URI to `https://your-domain/auth/mastodon/callback`

> Works with any Mastodon-compatible instance mastodon.social, fosstodon.org, hachyderm.io, etc.

### YouTube
1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the YouTube Data API v3
3. Create OAuth 2.0 credentials; set redirect URI to `http://localhost:3001/auth/youtube/callback`

> Google requires app verification for production. Until verified, refresh tokens expire after 7 days.

### Facebook Pages
1. Use the same Meta app as Threads/Instagram
2. Add **Manage everything on your Page** use case
3. Set redirect URI to `https://your-domain/auth/facebook/callback`
4. Requires a **Facebook Page** personal profiles are not supported by the Graph API

> First comment support requires `pages_manage_engagement` (pending Meta app review).

### Pinterest
1. Create an app at [developers.pinterest.com](https://developers.pinterest.com)
2. Enable scopes: `boards:read`, `pins:read`, `pins:write`, `user_accounts:read`
3. Set redirect URI to `https://your-domain/auth/pinterest/callback`
4. Set `PINTEREST_CLIENT_ID` and `PINTEREST_CLIENT_SECRET` in `.env`

**Trial access (default):** New apps get Trial access pins can only be created in the sandbox.
- Set `PINTEREST_SANDBOX=true`
- Generate a sandbox token: My Apps → Manage → Generate Access Token → Sandbox
- Set `PINTEREST_SANDBOX_TOKEN` to that token

**Standard access (production):** Apply at developers.pinterest.com → My Apps → Request upgraded access. Once approved, set `PINTEREST_SANDBOX=false` and remove `PINTEREST_SANDBOX_TOKEN`. Users connect via normal OAuth.

> Posts as Pins on the user's first board. Image is required posts without an image are blocked at the UI level.

### X (Twitter)
1. Create a project + app at [developer.x.com](https://developer.x.com)
2. Set App permissions to **Read and write**
3. Enable **OAuth 1.0a** and set the callback URL to `https://your-domain/auth/twitter/callback`
4. Copy the API Key and API Key Secret into `X_API_KEY` / `X_API_SECRET`

> Requires Pro or Team plan when billing is enabled. Uses OAuth 1.0a, not OAuth 2.0.

### Telegram
No OAuth needed — uses the Telegram Bot API directly.

1. Open Telegram and message **@BotFather** → `/newbot` → follow the prompts to get a **bot token**
2. Create a Telegram **channel** (public or private)
3. Add your bot to the channel as an **Administrator** with at least the **Post Messages** permission
4. Go to **Accounts** in Posthive → **Connect Telegram Channel**
5. Paste the bot token and your channel username (e.g. `@mychannel`) or numeric chat ID (e.g. `-1001234567890`)

> Private channels: use the numeric chat ID. Forward any message from the channel to [@userinfobot](https://t.me/userinfobot) to get it.
> One bot can serve multiple channels — connect each channel separately in Posthive.
> No environment variables needed. Credentials are stored encrypted per-user.

### Nostr
No OAuth, no app registration — uses your keypair directly.

1. Go to **Accounts** in Posthive → **Connect Nostr**
2. Paste your `nsec1...` private key — or click **Generate a new keypair** to create a fresh one
3. Your profile name and photo are fetched automatically from relays

> Your `nsec` is stored AES-256-GCM encrypted and never exposed. Posts publish as **Kind 1 notes** to four default relays (Damus, Nostr.band, nos.lol, Snort). Images are appended as URLs in the note content and tagged with NIP-92 imeta for clients that support inline rendering.
> No environment variables needed.

---

## Bulk CSV Scheduling

Upload a CSV to schedule multiple posts at once. Available from the **Posts** page (Bulk button) and the **Compose** page (Bulk CSV button).

**CSV format:**
```
scheduled_for,text,accounts,comment,image_urls
2026-08-01 09:00,Good morning 🌅,all,,
2026-08-02 14:30,Blog post link,bluesky|mastodon,Link in first comment,
2026-08-03 18:00,Skip Instagram today,!instagram,,
2026-08-04 10:00,With an image,linkedin,,https://example.com/image.jpg
2026-08-05 12:00,Two images,bluesky|threads,,https://img1.jpg;https://img2.jpg
```

**Accounts column syntax:**
- `all` - all connected accounts except YouTube
- `bluesky|mastodon` - specific platforms, pipe-separated
- `!instagram` - all platforms except Instagram (and YouTube)
- `all|!instagram|!linkedin` - all except Instagram and LinkedIn

> YouTube is not supported in bulk scheduling it requires a video file. Use Compose instead.
> Instagram rows must include at least one image URL.

---

## How Scheduling Works

1. Write a post in Compose, pick accounts, set a time
2. API creates a `PostJob` in the DB and enqueues a BullMQ delayed job
3. At the scheduled time BullMQ fires the job (~1 second accuracy)
4. The worker processes each platform independently:
   - Refreshes OAuth tokens if needed
   - Posts the main content
   - Posts the first comment as a reply (if provided)
5. Each step is persisted before the next crash-safe and resumable
6. Real-time status updates via Server-Sent Events on the Posts page

### Job state machine (per PostJobTarget)

```
pending → running → post_done → comment_done  (= done)
                 ↘ post_failed
                              ↘ comment_failed
```

---

## Post Templates

Save and reuse post drafts from the Compose page:

1. Write a post and click **+ Save** in the POST section header
2. Give it a name (must be unique)
3. Click **Templates** to open the dropdown and load any saved template
4. Hover a template and click **✕** to delete it

Templates save: post text, first comment, YouTube title/description/type, and Pinterest title/description.

---

## API Reference

Posthive includes a full public REST API for Pro and Team plans (or all users when billing is disabled).

**Base URL:** `https://your-api-domain/api/v1`

**Authentication:** Bearer token — create an API key in Settings.

```
Authorization: Bearer ph_your_api_key
```

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| GET | /me | Identify the authenticated user (used by CLI/MCP login) |
| GET | /accounts | List connected accounts |
| POST | /posts | Schedule a post |
| GET | /posts | List posts (cursor-paginated) |
| GET | /posts/:id | Get single post |
| PATCH | /posts/:id | Update/reschedule pending post |
| POST | /posts/:id/approve | Promote a draft to scheduled |
| POST | /posts/:id/duplicate | Clone a post as a new draft |
| DELETE | /posts/:id | Delete post |
| POST | /upload | Upload media file |
| GET | /templates | List templates |
| POST | /templates | Create template |

See the full [documentation](https://posthive.co/docs) for request/response schemas.

---

## MCP — AI Agent Integration

Posthive exposes an MCP (Model Context Protocol) server so AI agents can schedule and manage posts directly. Every client below connects with the same bare URL — no API key to generate, copy, or paste. See [posthive.co/agent](https://posthive.co/agent) for a full interactive walkthrough per client.

**Requires:** Pro or Team plan (self-hosted with billing disabled: unlimited) · Rate limit: 60 req/min

### Claude / ChatGPT (OAuth connector, no install)

1. **Claude**: Settings → Connectors → Add custom connector. **ChatGPT**: Settings → Apps → Advanced settings → enable Developer mode, then Settings → Apps → Add app.
2. Enter `https://your-api/mcp`
3. Approve access in the browser prompt that opens

### Claude Code

```bash
claude mcp add --transport http posthive https://your-api/mcp
```

The first tool call opens your browser to sign in.

### Cursor

Add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "posthive": { "url": "https://your-api/mcp" }
  }
}
```

### VS Code (GitHub Copilot Chat)

Add to `.vscode/mcp.json`:
```json
{
  "servers": {
    "posthive": { "type": "http", "url": "https://your-api/mcp" }
  }
}
```

### Codex

Add to `~/.codex/config.toml`:
```toml
[mcp_servers.posthive]
url = "https://your-api/mcp"
```

### OpenClaw

```bash
openclaw mcp set posthive '{"url":"https://your-api/mcp","transport":"streamable-http"}'
```

### Hermes Agent

Add to `~/.hermes/config.yaml`:
```yaml
mcp_servers:
  posthive:
    url: "https://your-api/mcp"
```

### CLI for shell agents (OpenClaw, custom pipelines, scripts)

Not every agent speaks MCP. `posthive-cli` is a thin shell wrapper over the same public API:

```bash
npx posthive-cli login          # opens your browser, no API key needed
npx posthive-cli accounts:list
npx posthive-cli posts:create --content "Hello" --accounts acc_1,acc_2
```

Every command outputs structured JSON and ships a bundled `SKILL.md` for agent self-discovery. `posthive-mcp` (the npm-published MCP server) shares the same login via `~/.posthive/config.json` — sign in once, use both.

### Fallback: API key in URL

For a client that doesn't support OAuth discovery, embed the key directly instead of the bare URL above: `https://your-api/mcp/ph_your_api_key_here`. Keep this URL private — revoke and regenerate from Settings → API Keys if it leaks.

### Available Tools

| Tool | Description |
|---|---|
| `list_accounts` | List all connected social accounts |
| `create_post` | Create a scheduled or draft post |
| `get_post` | Get a single post by ID |
| `list_scheduled_posts` | List posts with optional status filter |
| `approve_draft` | Promote a draft to scheduled |
| `update_post` | Update content or reschedule a pending post |
| `duplicate_post` | Clone a post as a new draft |
| `delete_post` | Delete a post |
| `list_templates` | List saved post templates |
| `create_from_template` | Create a post from a template |

### Media via MCP

MCP tools accept `media_urls` (array of public URLs). Binary upload is not possible via MCP — upload files first via `POST /api/v1/upload` and pass the returned URLs to `create_post`.

Instagram `media_type`: `post` · `reel` · `story`
YouTube `youtube_type`: `short` · `video`

---

## Plans

| Plan | Accounts | Posts/month | API Keys |
|---|---|---|---|
| Creator | 3 | 400 | - |
| Pro | 15 | Unlimited | Unlimited |
| Team | 50 | Unlimited | Unlimited |

All plans include a **14-day free trial**. Powered by [Dodo Payments](https://dodopayments.com).

Set `ENABLE_BILLING=false` for self-hosted mode all features unlocked, no plan limits, no Dodo account needed.

---

## Character Limits

| Platform | Limit |
|---|---|
| Bluesky | 300 graphemes |
| Threads | 500 characters |
| Instagram | 2,200 characters |
| LinkedIn | 3,000 characters |
| Mastodon | 500 characters |
| YouTube | Title: 100 · Description: 5,000 |
| Facebook Pages | 63,206 characters |
| Pinterest | Title: 100 · Description: 500 |
| X (Twitter) | 280 characters |
| Telegram | 4,096 characters |
| Nostr | 10,000 characters |

---

## Self-Hosting

Posthive is designed to be self-hosted. Billing is optional.

**Without billing (default):**
```env
# apps/api/.env
ENABLE_BILLING=false

# apps/web/.env.local
NEXT_PUBLIC_ENABLE_BILLING=false
```
All features are unlocked for all users. No Dodo account needed. Onboarding skips plan selection.

**With billing:**
```env
ENABLE_BILLING=true
NEXT_PUBLIC_ENABLE_BILLING=true
```
Create a [Dodo Payments](https://dodopayments.com) account and fill in all `DODO_*` env vars. Users get a 14-day free trial on signup.

---

## Production Deployment

Recommended stack: **Railway** (API + Redis) · **Supabase** (Postgres + Storage) · **Vercel** (Next.js)

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Storage → create a bucket named `media` → set it to **Public**
3. Settings → Database → Connection String → Session pooler (port 5432) → copy URI

### 2. Railway - API

1. New project → Deploy from GitHub → Root Directory: `apps/api`
2. Add a Redis service → copy private URL as `${{ Redis.REDIS_URL }}`
3. Set environment variables (see table above)
4. **Build Command:** `npm install && npx prisma generate && npm run build`
5. **Start Command:** `npx prisma migrate deploy && node dist/index.js`
6. Add custom domain → set port to `3001`

### 3. Vercel - Frontend

1. Import same repo → Root Directory: `apps/web`
2. Add env vars: `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_ENABLE_BILLING`

### 4. Migrations

Migrations run automatically on deploy via `prisma migrate deploy`. To create a migration locally:

```bash
cd apps/api
npx prisma migrate dev --name describe_your_change
git add prisma/migrations
git commit -m "db: add <describe_your_change> migration"
```

> Use the **direct connection** URL (not the pooler) when running `prisma migrate dev` locally.

---

## Adding a New Platform

1. Create `apps/api/src/adapters/<platform>.ts` implementing `PlatformAdapter`
2. Register in `apps/api/src/adapters/index.ts`
3. Add OAuth routes in `apps/api/src/routes/auth.ts`
4. Add platform card in `apps/web/src/app/accounts/page.tsx`
5. Add favicon domain in `apps/web/src/components/PlatformIcon.tsx`
6. Add char limit in `PLATFORM_LIMIT` in `apps/web/src/app/compose/page.tsx`
7. Add preview component in `PlatformPreview` in `apps/web/src/app/compose/page.tsx`

---

## License

GNU Affero General Public License v3.0 see [LICENSE](LICENSE) for details.

If you modify this project and run it as a network service, you must make your modified source code available to users of that service.
