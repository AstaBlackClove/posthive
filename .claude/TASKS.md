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
- [x] **Post templates** — save/load/delete templates from compose; Templates dropdown + Save button; YouTube fields; duplicate name guard
- [x] **Bulk scheduling** — CSV upload modal on Compose + Posts pages; `!platform` exclusion syntax; Instagram image validation; preview table; progress bar
- [ ] **Queue / Best time to post** — auto-schedule to next available optimal slot
- [ ] **AI caption assist** — "Generate caption" button powered by Claude API; platform-aware char limits
- [ ] **Draft posts** — save a compose state as draft without scheduling; list in Posts page

### Edit Dialog
- [ ] **Video replacement in edit** — `uploadFiles` in `EditPostDialog.tsx` only processes images; selecting a video file in Reel mode or YouTube upload mode silently does nothing. Users must delete and repost to change a video. Fix: handle `video/*` files in `uploadFiles` for reel mode, and add a video file input to the YouTube upload-mode section.

### Posts / Calendar
- [x] **Week/Day view polish** — timegrid event cards, slot height, now indicator, today column highlight
- [ ] **Post analytics** — view engagement stats (likes, replies, reposts) pulled from each platform after publishing
- [ ] **Duplicate post** — clone an existing post to reschedule without re-typing

### Accounts
- [x] **Multiple accounts per platform** — upsert key is `{platform, displayName, userId}`; connecting a different username creates a second row automatically
- [ ] **Account groups** — tag accounts into groups (e.g. "Work", "Personal") and target a group in compose

### Marketing & Docs
- [x] **`/features` page — screenshots/GIFs** — all screenshots added including bulk CSV
- [ ] **Landing page — social proof** — testimonials or logo wall once early users available
- [ ] **Landing page — demo video** — 60s product walkthrough embed in hero
- [ ] **`/changelog` page** — public changelog / release notes

### Infrastructure / DevEx
- [ ] **Webhook outbound** — fire a webhook to a user-configured URL on post publish (useful for integrations)
- [ ] **Zapier / Make integration** — trigger via webhook; document in API reference
- [ ] **Multi-user / team workspaces** — Team plan currently single-user; add workspace invite + member roles
- [ ] **Audit log** — track schedule/edit/delete actions per user for Team plan

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
- [x] X/Twitter OAuth 1.0a + adapter — v2 tweets API, v1.1 media upload (up to 4 images), reply support, Pro & Team only gate, 100-tweet/month per-user cap

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
- [x] Landing page — bulk CSV deep-dive section + 7th feature card
- [x] Landing page — pricing section synced with /pricing page (✓/— format, same copy)
- [x] Landing page — Ferndesk-style footer with Features (SVG icons), Product, Company columns; X + LinkedIn social icons
- [x] Landing page — H1 "one place." tilted purple highlight
- [x] `/features` individual feature slug pages — unique layout per feature (split-right, split-left, center)
- [x] Feature pages — inline JSX mockups: composer, Reels selector, calendar, first-comment thread, per-platform overrides, CSV table, terminal
- [x] Feature pages — platform favicons via Google S2 in multi-platform + per-platform mockups
- [x] Feature pages — full SEO: keyword-rich titles + descriptions for all 7, OG image, Twitter card, canonical URL, HowTo JSON-LD, BreadcrumbList JSON-LD
- [x] Feature page slug rename: `reels-and-stories` → `instagram-reels-scheduler` with 301 redirect
- [x] Features nav dropdown — bulk CSV scheduling entry
- [x] `/docs` page — full docs with collapsible sidebar, copy buttons, API reference, bulk CSV + templates sections
- [x] `/docs` in-page search — filter across all sections from sidebar
- [x] `/pricing` standalone page — INR/USD toggle, plan cards, comparison table, FAQ accordion, FAQPage JSON-LD
- [x] `/blog` page + Introducing Posthive launch post (Article JSON-LD)
- [x] Dynamic OG images — Ferndesk-style dark home layout, unique layouts for pricing/docs/features/blog/post; glow blobs removed
- [x] `NEXT_PUBLIC_WEB_URL` env var — documented in README + .env.example; controls OG, sitemap, robots
- [x] SEO — SoftwareApplication JSON-LD in root layout; FAQPage on pricing; Article on blog post
- [x] SEO — keywords meta on root layout; keyword overrides per feature page
- [x] 14-day trial wording across all copy (was 7-day)
- [x] `robots.txt` + sitemap (updated with /pricing, /blog, all feature slugs, posthive.co fallback)
- [x] README — comprehensive rewrite covering all features, platforms, env vars, bulk CSV format, API reference
- [x] Billing page plan features synced with /pricing page (Creator/Pro/Team)
