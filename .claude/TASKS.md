# Posthive — Task Tracker

## In Progress

---

## Recently Completed
- [x] Billing & payment gate — full Dodo Payments integration (trial, upgrade, downgrade, cancellation, webhooks)
- [x] Onboarding flow — 3-step page (plan → connect → first post) shown after registration
- [x] Account limit enforcement — UI disables connect buttons when plan limit reached
- [x] Post limits per plan — Creator: 400/mo, Pro/Team: unlimited; enforced at scheduling
- [x] INR/USD currency detection — timezone-based, shown on billing + onboarding
- [x] Cancel subscription flow — modal with reason + feedback, cancels at period end
- [x] Silent JWT refresh — apiFetch auto-retries after 401 with refresh token
- [x] Inline content editing in list view — Edit button on pending cards opens panel with caption, first comment, scheduled time; PATCH to `/jobs/:id`

---

## Pending Features

### Platform Adapters
- [ ] **LinkedIn adapter** — requires LinkedIn developer app + OAuth (coming soon)
- [ ] **Threads token auto-refresh** — long-lived token expires after 60 days; add cron to refresh before expiry

### Instagram
- [x] **Reels (video)** — `media_type: REELS`, video upload + 5min container polling
- [x] **Stories** — `media_type: STORIES`, image-only, no caption
- [x] **Alt text on images** — `accessibility_caption` per image/carousel item
- [ ] **Video carousel** — mix of image + video items in one carousel post
- [ ] **Location tagging** — `location_id` on the media container (requires Facebook Location Search API)
- [ ] **User tagging** — `user_tags` array on image containers (requires username → ID resolution)
- [ ] **Collaborator tagging** — `collaborators` field (co-author posts); Instagram API supports this
- [ ] **Instagram token expiry warning** — tokens expire in ~60 days; show warning in Accounts page when < 7 days left (adapter already refreshes automatically, but UI should warn)

### Compose / Scheduling
- [ ] **Timezone support** — all times are currently server-local; let users pick their timezone
- [ ] **Recurring posts** — schedule a post to repeat daily/weekly
- [ ] **Post templates** — save draft content as reusable templates
- [ ] **Bulk scheduling** — upload CSV to schedule many posts at once
- [ ] **Queue / Best time to post** — auto-schedule to next available optimal slot

### Posts / Calendar
- [ ] **Click event on calendar** to open post detail / edit modal
- [ ] **Week/Day view** polish — timegrid styling needs work at small cell heights
- [ ] **Filter by platform** in list and calendar views

### Accounts
- [ ] **Account health check** — warn when token is close to expiry (< 7 days)
- [ ] **Re-auth flow** — one-click reconnect when token has expired
- [ ] **Account usage stats** — posts published per account

### Billing
- [ ] **Dodo webhook production setup** — configure webhook URL in Dodo dashboard for live mode
- [ ] **Plan enforcement** — block scheduling when account limit is reached (currently only warns)
- [ ] **Cancellation flow** — handle `subscription.cancelled` webhook event
- [ ] **Test checkout end-to-end** with real Dodo payment

### Onboarding
- [x] **Onboarding flow** — multi-step page shown after registration, before the main app
  - Step 1: Pricing — show plan cards (Creator / Pro / Team), highlight what each includes, "Start free trial" triggers Dodo checkout with card capture; trial activates via webhook
  - Step 2: Connect an account — prompt user to connect at least one platform (Bluesky / Threads / Instagram) before continuing; skip allowed but discouraged
  - Step 3: Schedule your first post — stripped-down compose UI (no sidebar distraction), write caption, pick account, pick time, hit "Schedule"; completing this is the aha moment
  - After step 3 (or skip): redirect into main app (`/`)
  - Gate: if `planStatus === "inactive"` and path is not `/onboarding`, `/login`, `/register` → redirect to `/onboarding`
  - Progress indicator (3 steps) shown at top of onboarding page
  - Design: full-screen dark, centred card layout, no sidebar

### Auth / Users
- [ ] **Email verification** on register
- [ ] **Password reset** flow (forgot password)
- [ ] **Profile page** — change name, avatar, password

### Infrastructure
- [ ] **Rebrand** — rename "Social Scheduler" → "Posthive" throughout app (sidebar, page title, meta)
- [ ] **Logo** — design and implement Posthive logo (deferred)
- [ ] **Production deployment** — Railway / Fly.io setup with Postgres + Redis
- [ ] **Switch DB to Postgres** for production (schema is already compatible)
- [ ] **Image storage** — switch from local disk to Supabase Storage / S3 for production
- [ ] **Error monitoring** — add Sentry or similar
- [ ] **Rate limiting** — add per-user API rate limits

---

## Completed
- [x] Threads OAuth + adapter
- [x] Bluesky adapter (app password)
- [x] Instagram OAuth + adapter (image + carousel)
- [x] Instagram preview in compose (Instagram-style layout)
- [x] Instagram image warning in compose when no image attached
- [x] Dodo Payments billing integration (checkout + webhook)
- [x] Dark UI overhaul
- [x] Calendar view with drag-to-reschedule
- [x] Calendar — block past dates, gray out past days
- [x] Calendar — drag-to-navigate month by hovering arrows while dragging
- [x] Calendar — today cell full border highlight
- [x] Calendar — hover border effect
- [x] Post delete with media cleanup (storage + DB)
- [x] Inline reschedule from list view
- [x] List view — smooth spring hover animation + grid-row expand for targets
- [x] Bluesky connect dialog on Accounts page
- [x] DB schema fixes — cascade delete, indexes, drop unused refreshToken column
- [x] RefreshToken cleanup on login (one token per user)
- [x] CLAUDE.md + .claude/TASKS.md created
