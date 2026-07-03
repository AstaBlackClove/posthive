# Posthive — Task Tracker

---

## In Progress

(nothing in progress)

---

## Pending Features

### Blocked on External Approval
- [ ] **Facebook first comment** — requires `pages_manage_engagement` permission (pending Meta app review). Re-enable `createComment` in `apps/api/src/adapters/facebook.ts` once approved.
- [ ] **CRITICAL — Google app verification** — refresh tokens expire after 7 days in Testing mode. In progress (4–6 weeks). Required: privacy policy, ToS, domain ownership, demo video for sensitive scopes.

### YouTube (deferred until user growth)
- [ ] **Privacy status override** — hardcoded to `public`; expose `private`/`unlisted` as per-platform override. Scope already present (`youtube.force-ssl`); deferred.
- [ ] **Thumbnail upload** — `thumbnails.set` API, scope already present; deferred until Google app verification completes.

### Instagram Advanced (blocked on Meta app review)
- [x] **Video carousel** — mixed image + video carousel already supported in adapter
- [ ] **Location tagging** — `location_id` on media container (requires Facebook Location Search API; pending Meta approval)
- [ ] **User tagging** — `user_tags` array on image containers (pending Meta approval)
- [ ] **Collaborator tagging** — `collaborators` field (pending Meta approval)

### Compose / Scheduling
- [ ] **Timezone support** — already works via browser local time; may need server-side timezone awareness for recurring posts
- [ ] **Recurring posts** — schedule a post to repeat daily/weekly
- [x] **Post templates** — save/load/delete templates from compose; Templates dropdown + Save button
- [x] **Bulk scheduling** — CSV upload modal on Posts page; preview table, per-row validation, progress bar
- [ ] **Queue / Best time to post** — auto-schedule to next available optimal slot

### Posts / Calendar
- [x] **Week/Day view polish** — timegrid event cards, slot height, now indicator, today column highlight

### Marketing & Docs
- [ ] **`/features` page — screenshots/GIFs** — replace image slot placeholders with real assets
- [ ] **`/docs` page — fill image slots** — replace `DocImage` placeholders with actual screenshots
- [ ] **`/docs` page — search** — in-page search / filter across sections
- [ ] **`/pricing` page** — dedicated standalone pricing page (currently only on landing `/#pricing`)
- [ ] **`/changelog` page** — public changelog / release notes
- [ ] **`/blog` page** — optional content marketing hub
- [ ] **Open Graph images** — `og:image` meta for `/`, `/features`, `/docs` pages
- [ ] **Landing page A/B hero** — test two hero headlines

---

## Completed

### This Session
- [x] **Retry failed platforms** — "Retry failed" button on Posts page re-queues only `post_failed` targets without re-posting successful ones
- [x] **Mastodon 30s fetch timeout** — prevents ECONNRESET from hanging; BullMQ retries cleanly
- [x] **Token auto-refresh cron** — batched background cron (every 12h, cursor pagination, concurrency 5) for Threads, Instagram, Facebook, YouTube
- [x] **Token expiry warning + reconnect** — amber/red banner on Accounts page; only shown for LinkedIn (auto-refresh platforms excluded)
- [x] **Email verification** — Resend email on register, `/verify-email` page, resend banner in sidebar, StrictMode double-call fix
- [x] **Account usage stats** — `GET /accounts/stats` + green "N posts this month" badge on each account row
- [x] **Docs copy buttons** — clipboard copy button on every code block in `/docs`
- [x] **robots.txt + sitemap** — `/robots.txt` blocks app routes, `/sitemap.xml` covers public pages
- [x] **Sentry error monitoring** — API worker + job runner failures captured; DSN via env var
- [x] **API key access** — Pro/Team plans (or all users when billing disabled); create/revoke in Settings
- [x] **Full public REST API** — `/api/v1/*` with Bearer auth, all CRUD endpoints, perAccount/dryRun/mediaType support
- [x] **RLS on ApiKey + EmailVerification tables** — enabled in migrations

### Platform Adapters
- [x] Bluesky adapter (app password auth, 300 char limit)
- [x] Threads OAuth + adapter (500 chars, 60-day token refresh)
- [x] Instagram OAuth + adapter (image, carousel, Reels, Stories, alt text)
- [x] LinkedIn OAuth + adapter (text + image posts via UGC API)
- [x] Mastodon OAuth + adapter (any instance, text + media)
- [x] YouTube OAuth + adapter — resumable video upload, Shorts, 1h access token auto-refresh
- [x] Facebook Pages OAuth + adapter — Graph API v21.0, long-lived page tokens, text/photo/video/carousel

### Compose & Scheduling
- [x] Per-platform content overrides in compose
- [x] Image & video support (up to 4 images or 1 video, alt text)
- [x] Instagram / YouTube previews in compose
- [x] YouTube dedicated Title + Description fields; main Post box hidden when only YouTube selected
- [x] YouTube "requires a video" hard block on Schedule button
- [x] Confetti on first scheduled post
- [x] Dry run mode — full pipeline test without real API calls

### Posts & Calendar
- [x] Calendar view with drag-to-reschedule
- [x] Calendar — past dates blocked, today highlight, drag-to-navigate months
- [x] Calendar — click event opens edit modal; platform filter
- [x] Filter by platform in list and calendar
- [x] Post delete with media cleanup
- [x] Inline reschedule + edit from list view
- [x] List view — hover animation + grid-row expand for targets

### Plan Gates & Billing
- [x] Dodo Payments — checkout, webhook, live mode confirmed
- [x] Subscription change, cancel flow, cancellation webhook
- [x] Trial banner — countdown, expired, inactive states
- [x] Onboarding flow — 3-step; skips plan when billing disabled
- [x] Account + post limits enforced per plan (API + UI)
- [x] INR/USD currency detection
- [x] ENABLE_BILLING flag for self-hosted mode
- [x] Plan gates — Reels/Stories, per-platform overrides, image count

### Auth
- [x] JWT auth with silent refresh
- [x] Password reset flow (Resend email)
- [x] Email verification (Resend email)
- [x] Profile page — name, timezone, password, API keys, delete account

### Infrastructure
- [x] Production deployment — Railway (API + Web + Postgres + Redis)
- [x] Supabase Storage adapter
- [x] Rate limiting — global + auth route overrides
- [x] Sentry error monitoring (backend only)
- [x] Background token refresh cron (batched, cursor-paginated)
- [x] Orphan upload cleanup cron (every 6h)

### Branding & Marketing
- [x] Rebrand to Posthive throughout
- [x] Landing page — hero, features, pricing (USD + INR), how-it-works, footer, NavBar
- [x] `/features` marketing page
- [x] `/docs` page — full docs with collapsible sidebar, copy buttons, API reference
- [x] `robots.txt` + sitemap
