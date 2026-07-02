# Posthive — Task Tracker

---

## In Progress

(nothing in progress)

---

## Pending Features

### YouTube — follow-ups
- [ ] **CRITICAL — Google app verification** — while the OAuth consent screen stays in "Testing" status, Google expires refresh tokens after 7 days regardless of activity. This silently breaks scheduled YouTube posts weekly until the account is manually reconnected. Testing mode is also capped at 100 manually-added test users — anyone outside that list is hard-blocked (`Error 403: access_denied`) before they even see a consent screen. Required for verification: privacy policy URL, terms of service URL, real app homepage domain (not a tunnel), domain ownership via Search Console, and a demo video justifying use of the `youtube.upload` / `youtube.force-ssl` sensitive scopes. Turnaround is days to weeks.
- [ ] **Privacy status override** — currently hardcoded to `public`; expose `private`/`unlisted` as a per-platform override in the Customize dialog
- [ ] **YouTube token expiry warning** — show warning in Accounts page when access token can't be silently refreshed (e.g. refresh_token revoked or expired due to unverified-app 7-day limit)
- [ ] **Thumbnail upload** — YouTube Data API supports custom thumbnails (`thumbnails.set`); not wired up yet, auto-generated thumbnail is used

### Platform Adapters
- [ ] **Threads token auto-refresh cron** — tokens refresh on-demand before posting, but no background cron for idle accounts
- [ ] **Facebook first comment** — requires `pages_manage_engagement` permission (pending Meta app review). Re-enable `createComment` in `apps/api/src/adapters/facebook.ts` once approved.

### Instagram Advanced
- [ ] **Video carousel** — mix of image + video items in one carousel post
- [ ] **Location tagging** — `location_id` on media container (requires Facebook Location Search API)
- [ ] **User tagging** — `user_tags` array on image containers (requires username → ID resolution)
- [ ] **Collaborator tagging** — `collaborators` field (co-author posts)
- [ ] **Instagram token expiry warning** — show warning in Accounts page when token < 7 days left

### Compose / Scheduling
- [ ] **Timezone support** — all times are server-local; let users pick their timezone in settings
- [ ] **Recurring posts** — schedule a post to repeat daily/weekly
- [ ] **Post templates** — save draft content as reusable templates
- [ ] **Bulk scheduling** — upload CSV to schedule many posts at once
- [ ] **Queue / Best time to post** — auto-schedule to next available optimal slot

### Posts / Calendar
- [ ] **Week/Day view polish** — timegrid styling needs work at small cell heights

### Accounts
- [ ] **Re-auth flow** — one-click reconnect when token has expired
- [ ] **Account usage stats** — posts published per account this month

### Billing
- [ ] **Dodo webhook production setup** — configure webhook URL in Dodo dashboard for live mode
- [ ] **Test checkout end-to-end** with real Dodo payment

### Auth / Users
- [ ] **Email verification** on register
- [ ] **Profile page UI** — API endpoints exist (`/user/profile`, `/user/password`) but no web page yet

### Infrastructure
- [ ] **Production deployment** — Railway / Fly.io setup with Postgres + Redis
- [ ] **Switch DB to Postgres** for production (schema already compatible)
- [ ] **Error monitoring** — add Sentry or similar
- [ ] **Account health check UI** — accounts page should show warning badge when token expiry < 7 days

### Marketing & Docs
- [ ] **`/features` page — per-feature deep sections** — each feature (multi-platform, reels, calendar, etc.) should have its own anchor section with real screenshots/GIFs once assets are ready; currently uses image slot placeholders
- [ ] **`/docs` page — fill image slots** — placeholder `DocImage` components throughout; replace with actual screenshots when available
- [ ] **`/docs` page — search** — add in-page search / filter across sections
- [ ] **`/docs` page — copy code blocks** — add clipboard copy button to code snippets
- [ ] **`/pricing` page** — dedicated standalone pricing page (currently only on landing page `/#pricing`)
- [ ] **`/changelog` page** — public changelog / release notes
- [ ] **`/blog` page** — optional content marketing hub
- [ ] **Landing page A/B hero** — test two hero headlines
- [ ] **Open Graph images** — `og:image` meta for `/`, `/features`, `/docs` pages
- [ ] **`robots.txt` + sitemap** — SEO basics for public pages

---

## Completed

### Platform Adapters
- [x] Bluesky adapter (app password auth, 300 char limit)
- [x] Threads OAuth + adapter (500 chars, 60-day token refresh)
- [x] Threads token refresh — `refreshTokenIfNeeded()` refreshes when < 7 days remaining
- [x] Instagram OAuth + adapter (image, carousel, Reels, Stories, alt text)
- [x] LinkedIn OAuth + adapter (text + image posts via UGC API)
- [x] Mastodon OAuth + adapter (any instance, text + media)
- [x] YouTube OAuth + adapter — Google OAuth 2.0 (`youtube.upload` + `youtube.readonly` + `youtube.force-ssl` scopes), resumable video upload via YouTube Data API v3, posts as Shorts; 1h access token auto-refresh via refresh_token; `#Shorts` auto-appended to description to ensure Shorts-shelf classification
- [x] Facebook Pages OAuth + adapter — Graph API v21.0, long-lived page access tokens (~60 days auto-refresh), text/single photo/multi-photo carousel/video posts; first comment skipped pending `pages_manage_engagement` approval

### Compose & Scheduling
- [x] Per-platform content overrides in compose
- [x] Image & video support (up to 4 images or 1 video, alt text)
- [x] Instagram preview in compose
- [x] Instagram image warning in compose when no image attached
- [x] YouTube preview in compose — title/description split + video thumbnail
- [x] YouTube dedicated Title + Description fields in compose (separate from the shared Post box other platforms use), auto-synced via per-account overrides; main Post box hidden when only YouTube accounts are selected
- [x] YouTube "requires a video" hard block — Schedule button disabled (not just a warning) until a video is attached
- [x] Confetti on first scheduled post
- [x] Dry run mode — full pipeline test without real API calls

### Posts & Calendar
- [x] Calendar view with drag-to-reschedule
- [x] Calendar — block past dates, gray out past days, today highlight, hover border
- [x] Calendar — click event opens edit modal
- [x] Calendar — drag-to-navigate month by hovering arrows while dragging
- [x] Calendar — platform filter fixed (was passing `jobs` instead of `filteredJobs` to CalendarView)
- [x] Filter by platform in jobs list and calendar
- [x] Post delete with media cleanup (storage + DB)
- [x] Inline reschedule + edit from list view (caption, first comment, scheduled time)
- [x] List view — smooth spring hover animation + grid-row expand for targets

### Plan Gates & Billing
- [x] Dodo Payments billing integration (checkout + webhook)
- [x] Subscription plan change (upgrade/downgrade) via `changePlan()` — prorated immediately
- [x] Cancel subscription flow — modal with reason, cancels at period end
- [x] Cancellation webhook — `subscription.cancelled` / `subscription.failed` handled
- [x] Trial banner — countdown, expired state, inactive state
- [x] Onboarding flow — 3-step (plan → connect → first post); skips plan step when billing disabled
- [x] Account limit enforcement — UI disables connect buttons when plan limit reached
- [x] Post limits per plan — Creator: 400/mo, Pro/Team: unlimited
- [x] INR/USD currency detection — timezone-based, shown on billing + onboarding
- [x] ENABLE_BILLING flag — self-hosted mode skips all billing/limits
- [x] Plan gate — Reels & Stories (Creator plan locked; 402 on API + lock icon in compose)
- [x] Plan gate — Per-platform overrides (Creator plan locked; 402 on API + lock icon on Customize button)
- [x] Plan gate — Image upload count (Creator: max 4, Pro/Team: max 10; enforced API + UI)

### UI / UX
- [x] Dark UI overhaul
- [x] Bluesky connect dialog on Accounts page
- [x] Cancelled subscription state on Accounts page — connect buttons disabled, red banner
- [x] Loading skeletons — compose page (accounts + platform selector) and accounts page (4-card shimmer)
- [x] Mojibake fix — compose page had UTF-8 double-encoded characters (⚠️, ✓, —, …); fully fixed

### Auth
- [x] Silent JWT refresh — apiFetch auto-retries after 401
- [x] RefreshToken cleanup on login (one token per user)
- [x] Password reset flow — forgot password → email link → reset page

### Infrastructure
- [x] Supabase Storage adapter — fully implemented (`SupabaseStorage` class)
- [x] Rate limiting — `@fastify/rate-limit` global (100/min) + auth route overrides (10/15min)
- [x] DB schema fixes — cascade delete, indexes
- [x] Prisma migration — `UploadedFile` model for storage tracking + `PasswordResetToken` model

### Branding & Marketing
- [x] Rebrand — fully renamed to Posthive throughout (sidebar, meta, pages)
- [x] Logo — posthivemain.png in sidebar, login, register, README
- [x] README rewrite — logo, badges, full platform list, env vars, self-hosting docs
- [x] Landing page (`/`) — hero, features, pricing (USD + INR), how-it-works, footer
- [x] Landing page — NavBar with Features/Platforms dropdowns, blur backdrop, scroll-border, mobile hamburger
- [x] Landing page — USD prices corrected ($9 Creator, $29 Pro, $49 Team)
- [x] `/features` marketing page — hero, 6 alternating feature sections, platform support table, CTA, footer
- [x] `/features` page — same full NavBar as landing page (extracted to `LandingNav.tsx` shared component)
- [x] `/docs` page — full documentation with sidebar, all sections, image slot placeholders (`DocImage`)
- [x] Docs — fixed `borderLeft` shorthand React warning (replaced with explicit longhand properties)

### Dev Setup
- [x] CLAUDE.md + .claude/TASKS.md
