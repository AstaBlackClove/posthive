# Posthive — CLAUDE.md

Social media scheduling SaaS. Schedule posts to Bluesky, Threads, and Instagram from a single UI. Self-hostable, open-source (AGPL-3.0).

---

## Monorepo Structure

```
social-scheduler/
├── apps/
│   ├── api/          Fastify v4 backend (Node.js, TypeScript, ESM)
│   └── web/          Next.js 16 frontend (App Router, TypeScript)
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
| `routes/auth.ts` | `/auth/*` | JWT login/register + Threads & Instagram OAuth |
| `routes/accounts.ts` | `/accounts` | List/disconnect social accounts |
| `routes/jobs.ts` | `/jobs` | CRUD + reschedule + delete scheduled posts |
| `routes/upload.ts` | `/upload` | Image upload → local disk or Supabase Storage |
| `routes/billing.ts` | `/billing` | Dodo Payments checkout + webhook |
| `routes/user.ts` | `/user` | Profile info |

### Platform Adapters — `src/adapters/`
Each adapter implements `PlatformAdapter` from `types.ts`:
- `bluesky.ts` — AT Protocol (app password auth)
- `threads.ts` — Meta Threads API (OAuth 2.0, 60-day tokens)
- `instagram.ts` — Instagram Business API (OAuth 2.0, image/carousel publishing)
- `linkedin.ts` — stub, not yet implemented

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

## Web — `apps/web`

**Stack:** Next.js 16 App Router · React 18 · Tailwind CSS · TypeScript

### Pages
| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Compose — write post, pick accounts, schedule |
| `/jobs` | `app/jobs/page.tsx` | Posts — list + calendar view |
| `/accounts` | `app/accounts/page.tsx` | Connect/disconnect social accounts |
| `/billing` | `app/billing/page.tsx` | Plan status + upgrade |
| `/login` | `app/login/page.tsx` | Login |
| `/register` | `app/register/page.tsx` | Register |

### Key Components
- `components/Sidebar.tsx` — nav sidebar with trial banner
- `components/CalendarView.tsx` — FullCalendar month/week/day with drag-to-reschedule
- `components/PlatformIcon.tsx` — favicon-based platform icons (Google S2)
- `components/TrialBanner.tsx` — bottom-left trial countdown
- `components/DateTimePicker.tsx` — datetime input used in compose

### API Client
- `lib/api.ts` — `apiFetch()` wrapper that auto-attaches auth cookie and handles 401 refresh

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
4. Add platform card in `apps/web/src/app/accounts/page.tsx`
5. Add favicon domain in `apps/web/src/components/PlatformIcon.tsx`
6. Add char limit in `PLATFORM_LIMIT` in `apps/web/src/app/page.tsx`
7. Add preview component in `PlatformPreview` in `apps/web/src/app/page.tsx`
