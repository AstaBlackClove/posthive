# Posthive — Task Tracker

## In Progress

---

## Pending Features

### Platform Adapters
- [ ] **Threads token auto-refresh cron** — tokens refresh on-demand in the adapter before posting, but no background cron to refresh before they expire when idle

### Instagram Advanced
- [ ] **Video carousel** — mix of image + video items in one carousel post
- [ ] **Location tagging** — `location_id` on the media container (requires Facebook Location Search API)
- [ ] **User tagging** — `user_tags` array on image containers (requires username → ID resolution)
- [ ] **Collaborator tagging** — `collaborators` field (co-author posts)
- [ ] **Instagram token expiry warning** — show warning in Accounts page when token < 7 days left (adapter auto-refreshes on post, but UI should warn proactively)

### Compose / Scheduling
- [ ] **Timezone support** — all times are currently server-local; let users pick their timezone
- [ ] **Recurring posts** — schedule a post to repeat daily/weekly
- [ ] **Post templates** — save draft content as reusable templates
- [ ] **Bulk scheduling** — upload CSV to schedule many posts at once
- [ ] **Queue / Best time to post** — auto-schedule to next available optimal slot

### Posts / Calendar
- [ ] **Week/Day view polish** — timegrid styling needs work at small cell heights

### Accounts
- [ ] **Re-auth flow** — one-click reconnect when token has expired
- [ ] **Account usage stats** — posts published per account

### Billing
- [ ] **Dodo webhook production setup** — configure webhook URL in Dodo dashboard for live mode
- [ ] **Plan enforcement** — `enforcePlan.ts` exists but jobs route doesn't call it to block scheduling; needs to return 403 when limit reached
- [ ] **Test checkout end-to-end** with real Dodo payment

### Auth / Users
- [ ] **Email verification** on register
- [ ] **Password reset** flow (forgot password → email link → reset)
- [ ] **Profile page** — API endpoints exist (`/user/profile`, `/user/password`) but no web UI yet

### Infrastructure
- [ ] **Production deployment** — Railway / Fly.io setup with Postgres + Redis
- [ ] **Switch DB to Postgres** for production (schema is already compatible)
- [ ] **Error monitoring** — add Sentry or similar
- [ ] **Account health check UI** — server auto-refreshes tokens before posting, but accounts page should show a warning badge when expiry < 7 days

---

## Completed

- [x] Bluesky adapter (app password auth)
- [x] Threads OAuth + adapter
- [x] Threads token refresh — `refreshTokenIfNeeded()` refreshes when < 7 days remaining
- [x] Instagram OAuth + adapter (image, carousel, Reels, Stories, alt text)
- [x] LinkedIn OAuth + adapter (text + image posts via UGC API)
- [x] Instagram preview in compose
- [x] Instagram image warning in compose when no image attached
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
- [x] Dark UI overhaul
- [x] Calendar view with drag-to-reschedule
- [x] Calendar — block past dates, gray out past days, today highlight, hover border
- [x] Calendar — click event opens edit modal
- [x] Calendar — drag-to-navigate month by hovering arrows while dragging
- [x] Filter by platform in jobs list and calendar
- [x] Post delete with media cleanup (storage + DB)
- [x] Inline reschedule + edit from list view (caption, first comment, scheduled time)
- [x] List view — smooth spring hover animation + grid-row expand for targets
- [x] Bluesky connect dialog on Accounts page
- [x] Cancelled subscription state on Accounts page — connect buttons disabled, red banner
- [x] DB schema fixes — cascade delete, indexes
- [x] RefreshToken cleanup on login (one token per user)
- [x] Silent JWT refresh — apiFetch auto-retries after 401
- [x] Confetti on first scheduled post
- [x] Dry run mode — full pipeline test without real API calls
- [x] Per-platform content overrides in compose
- [x] Image & video support (up to 4 images or 1 video, alt text)
- [x] Rebrand — fully renamed to Posthive throughout (sidebar, meta, pages)
- [x] Logo — posthivemain.png implemented in sidebar, login, register, README
- [x] README rewrite — logo, badges, full platform list, env vars, self-hosting docs
- [x] Supabase Storage adapter — fully implemented (`SupabaseStorage` class)
- [x] Rate limiting — `@fastify/rate-limit` global (100/min) + auth route overrides (10/15min)
- [x] CLAUDE.md + .claude/TASKS.md
