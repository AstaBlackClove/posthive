# Posthive — Platform Tracker

Status: ✅ Live | 🟡 Built / Pending Approval | 🔵 Planned | ⬜ Not started

---

## ✅ Live

| Platform | Notes |
|---|---|
| Bluesky | AT Protocol, app password auth, 300 chars |
| Threads | Meta OAuth 2.0, 500 chars, 60-day token auto-refresh |
| Instagram | OAuth 2.0, image/carousel/Reels/Stories, pending Meta review for advanced features |
| LinkedIn | OAuth 2.0, UGC API, text + image |
| Mastodon | OAuth 2.0, any instance, text + media |
| YouTube | Google OAuth 2.0, Shorts + video, resumable upload, pending Google verification |
| Facebook Pages | Graph API v21.0, text/photo/video/carousel |
| X / Twitter | OAuth 1.0a, v2 API, Pro & Team only, 100 tweets/mo cap |
| Telegram | Bot API, no OAuth — bot token + channel ID; text, images, video |

---

## 🟡 Built / Pending Approval

| Platform | Blocker | Notes |
|---|---|---|
| Pinterest | Standard access pending | Sandbox mode only; adapter complete |
| Facebook first comment | `pages_manage_engagement` — pending Meta review | Re-enable `createComment` in facebook.ts |

---

## 🔵 Planned (prioritised)

| Platform | Why | Effort | Notes |
|---|---|---|---|
| TikTok | Massive creator reach | 2–3 days | Video only — same pattern as YouTube; needs developer app + app review for DIRECT_POST |
| Reddit | Large communities, text-native | 2–3 days | OAuth 2.0, post to subreddits, flair support |
| ~~Telegram~~ | ~~Channels — broadcast use case~~ | ~~1–2 days~~ | ~~Bot API, no OAuth needed — just bot token~~ ✅ Done |
| Discord | Community servers | 2 days | Webhook-based (no OAuth needed) or Bot API |
| Medium | Long-form publishing | 1–2 days | REST API, OAuth 2.0, markdown posts |
| Hashnode | Developer blogging | 1 day | GraphQL API, PAT auth |
| Dev.to | Developer community | 1 day | REST API, API key auth |
| WordPress | Self-hosted blogs | 2–3 days | REST API, app passwords |

---

## ⬜ Not Started (evaluate when ready)

| Platform | Notes |
|---|---|
| Google My Business | Posts to GMB listing — good for local businesses; needs Google OAuth + verification |
| Slack | Workspace posting — more B2B use case; webhook or Bot API |
| Dribbble | Design portfolio — niche; API limited |
| Whop | Community platform — very niche |
| Twitch | Clips/stream announcements — needs stream context |
| Skool | Community platform — API availability unclear |
| Kick | Streaming platform — API very limited |
| Warpcast | Farcaster protocol — crypto-native, niche |
| VK | Russian social network — limited western user base |
| Lemmy | Federated Reddit alternative — very niche |
| MeWe | Privacy-focused — API availability unclear |
| Nostr | Decentralised protocol — crypto-native, niche |
| Listmonk | Self-hosted newsletter — not a social platform |

---

## Notes

- **Video-only platforms** (TikTok, YouTube, Kick, Twitch) require dedicated video upload UI — same pattern as YouTube adapter
- **API-key / webhook platforms** (Discord, Telegram, Dev.to, Hashnode) are fastest to build — no OAuth flow needed
- **App review platforms** (TikTok, Reddit) add waiting time but are high-value
- **Niche/crypto platforms** (Nostr, Warpcast, Lemmy) — build only if there's user demand
