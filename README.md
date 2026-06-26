# Social Scheduler

A self-hosted social media scheduler that lets you write a post once and schedule it across multiple platforms — with support for a **first comment** posted immediately after the main post.

Built with Next.js, Fastify, Prisma, BullMQ, and Upstash Redis.

---

## Features

- Schedule posts to **Bluesky**, **Threads**, and **LinkedIn** (coming soon)
- Optional **first comment** — posted as a reply right after the main post goes live
- **Image support** — upload up to 4 images per post (single image or carousel)
- **Exact-time scheduling** — BullMQ fires jobs within ~1 second of the scheduled time
- **Live updates** — job status page uses Server-Sent Events, no polling
- **Dry run mode** — tests the full scheduling pipeline without making any real API calls
- **Calendar view** — drag-and-drop to reschedule pending posts
- **Credentials encrypted at rest** — AES-256-GCM, never stored in plaintext
- SQLite locally, drop-in Postgres for production

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), Tailwind CSS |
| Backend | Fastify v4, TypeScript |
| Database | Prisma ORM — SQLite (dev) / Postgres (prod) |
| Queue | BullMQ + Redis (Upstash or Railway Redis) |
| Auth | Bluesky app passwords, Threads OAuth 2.0 |
| Storage | Local disk (dev) — swap to Supabase Storage for prod |

---

## Project Structure

```
social-scheduler/
├── apps/
│   ├── api/          # Fastify API server
│   │   ├── prisma/   # Database schema and migrations
│   │   ├── src/
│   │   │   ├── adapters/   # Platform adapters (Bluesky, Threads, LinkedIn)
│   │   │   ├── lib/        # Queue, worker, encryption, storage
│   │   │   ├── routes/     # API routes (accounts, jobs, auth, upload)
│   │   │   └── runner/     # Job state machine
│   │   └── uploads/        # Uploaded images (gitignored)
│   └── web/          # Next.js frontend
│       └── src/
│           ├── app/        # Pages (compose, jobs, accounts)
│           ├── components/ # Sidebar, CalendarView
│           └── lib/        # API client
└── package.json      # pnpm workspace root
```

---

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 — `npm install -g pnpm`
- **Redis** — [Upstash](https://upstash.com) free tier works great, or Railway Redis in production

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/social-scheduler.git
cd social-scheduler
pnpm install
```

### 2. Set up environment variables

**API** — copy and fill in:

```bash
cp apps/api/.env.example apps/api/.env
```

**Web** — copy and fill in:

```bash
cp apps/web/.env.example apps/web/.env.local
```

See the [Environment Variables](#environment-variables) section below for details on each variable.

### 3. Set up the database

```bash
cd apps/api
pnpm prisma migrate dev
pnpm prisma generate
```

### 4. Run the dev servers

From the repo root:

```bash
pnpm dev
```

This starts both the API (port 3001) and the web app (port 3000) in parallel.

- Web: http://localhost:3000
- API: http://localhost:3001

---

## Environment Variables

### `apps/api/.env`

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | API port. Defaults to `3001` |
| `DATABASE_URL` | Yes | Prisma DB URL. Use `file:./dev.db` for SQLite locally |
| `ENCRYPTION_KEY` | Yes | 64-character hex string for AES-256-GCM encryption. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `REDIS_URL` | Yes | Redis connection string. Get a free instance at [upstash.com](https://upstash.com) |
| `THREADS_APP_ID` | Yes* | Your Threads app ID from the Meta developer dashboard |
| `THREADS_APP_SECRET` | Yes* | Your Threads app secret |
| `THREADS_REDIRECT_URI` | Yes* | OAuth callback URL — must match exactly what's set in the Meta dashboard |
| `PUBLIC_API_URL` | Yes* | Public HTTPS URL of the API. Meta fetches uploaded images from this URL. Use a tunnel (e.g. VS Code port forwarding) in dev |

*Required only if you want Threads support.

### `apps/web/.env.local`

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | URL of the API server as seen from the browser. `http://localhost:3001` in dev |
| `NEXT_PUBLIC_THREADS_AUTH_URL` | Yes* | Full URL of the Threads OAuth start route. Must be HTTPS — use your tunnel URL in dev |

*Required only if you want Threads support.

---

## Connecting Accounts

### Bluesky

1. Go to **Accounts** in the app
2. Enter your Bluesky handle (e.g. `you.bsky.social`)
3. Generate an app password at [bsky.app](https://bsky.app) → Settings → App Passwords
4. Enter the app password and click Connect

### Threads

Threads requires a Meta developer app:

1. Go to [developers.facebook.com](https://developers.facebook.com) and create an app
2. Add the **Threads** use case
3. Under Advanced Settings, set the callback URL to `https://your-domain.com/auth/threads/callback`
4. Copy your **Threads App ID** and **App Secret** into `apps/api/.env`
5. In dev, add yourself as a Threads Tester in the Meta dashboard (development mode only allows testers)
6. Click **Connect with Threads** in the app and complete the OAuth flow

> **Note:** To allow any user to connect (not just testers), you need to submit your app for [Meta App Review](https://developers.facebook.com/docs/app-review) requesting the `threads_basic` and `threads_content_publish` permissions.

---

## How Scheduling Works

1. You create a post in the Compose page and pick a scheduled time
2. The API creates a `PostJob` record in the database and adds a BullMQ job with an exact delay
3. At the scheduled time BullMQ fires the job (within ~1 second accuracy)
4. The job runner processes each target platform independently:
   - Refreshes OAuth tokens if needed
   - Posts the main content
   - Posts the first comment as a reply (if provided)
5. Each step is persisted to the database before moving to the next — crash-safe and resumable
6. The Jobs page receives status updates in real time via Server-Sent Events

---

## Dry Run Mode

Toggle **Dry run** in the Compose page before scheduling. The full pipeline runs — BullMQ queue, worker, state machine, database writes — but no real API calls are made to any platform. Useful for verifying your setup is working end-to-end without actually posting.

---

## Production Deployment (Railway)

1. Create a new Railway project
2. Add a **Redis** service from the Railway dashboard
3. Deploy the repo — Railway auto-detects the monorepo
4. Set all environment variables from `apps/api/.env` in the Railway service settings
5. Set `DATABASE_URL` to a Railway Postgres instance (change `provider` in `prisma/schema.prisma` from `sqlite` to `postgresql`)
6. Set `PUBLIC_API_URL` to your Railway-assigned domain
7. Update `THREADS_REDIRECT_URI` and `NEXT_PUBLIC_THREADS_AUTH_URL` to your Railway domain

> Railway Redis has no per-command pricing — unlike Upstash, BullMQ's polling is free.

---

## Adding a New Platform

1. Create `apps/api/src/adapters/your-platform.ts` implementing the `PlatformAdapter` interface:

```typescript
export interface PlatformAdapter {
  name: string;
  refreshTokenIfNeeded(account: Account): Promise<Account>;
  createPost(account: Account, content: { text: string; mediaUrls: string[] }): Promise<PostResult>;
  createComment(account: Account, replyContext: unknown, comment: string): Promise<CommentResult>;
}
```

2. Register it in `apps/api/src/adapters/index.ts`
3. Add a connect route in `apps/api/src/routes/accounts.ts` or `auth.ts`
4. Add the platform card to `apps/web/src/app/accounts/page.tsx`

---

## Character Limits

| Platform | Post limit |
|---|---|
| Bluesky | 300 graphemes |
| Threads | 500 characters |
| LinkedIn | 3,000 characters |

The compose page shows per-platform counters and blocks submission if any selected platform's limit is exceeded.

---

## License

GNU Affero General Public License v3.0 — see [LICENSE](LICENSE) for details.

If you modify this project and run it as a network service, you must make your modified source code available to users of that service.
