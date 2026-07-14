---
name: posthive
description: Schedule social media posts to 13 platforms (Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook Pages, Pinterest, Telegram, X/Twitter, Nostr, Discord, Tumblr) via the Posthive CLI. Use when the user asks to create, schedule, list, update, or delete social media posts, or manage their posting queue.
---

# Posthive — social media scheduling

Schedule posts to 13 platforms (Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook Pages, Pinterest, Telegram, X/Twitter, Nostr, Discord, Tumblr) from the command line. Every command outputs structured JSON.

Powered by [`posthive-cli`](https://www.npmjs.com/package/posthive-cli) — installed automatically on first use via `npx`, or install globally with `npm i -g posthive-cli` for a shorter `posthive` command.

## Setup

If the user isn't already logged in, run `npx posthive-cli login` — it opens their browser to sign in and stores credentials in `~/.posthive/config.json`. No API key needed. Check with `npx posthive-cli whoami` first if unsure.

Alternatively, env vars always take priority over the stored login (useful for CI or scripts):

```bash
export POSTHIVE_API_KEY=ph_xxx        # Posthive → Settings → API Keys (Pro/Team plan)
export POSTHIVE_API_URL=http://localhost:3001   # optional — only for self-hosted Posthive, defaults to https://api.posthive.co
```

Run commands with `npx posthive-cli <command>`, or just `posthive <command>` if installed globally.

## Workflow

1. **Always start with `accounts:list`** to get valid account IDs — never guess IDs.
2. Create posts with `posts:create`. **Posts are saved as DRAFTS by default** — the user reviews them in Posthive before anything publishes. Only pass `--schedule` when the user explicitly asks to schedule directly.
3. Use `posts:approve` to promote a draft to the scheduled queue.

## Commands

```bash
# Auth (only if not already logged in)
npx posthive-cli login
npx posthive-cli whoami
npx posthive-cli logout

# List connected accounts (do this first)
npx posthive-cli accounts:list

# Create a draft post
npx posthive-cli posts:create --content "Hello world" --accounts id1,id2

# Create with first comment (link/hashtags go here, not the caption)
npx posthive-cli posts:create --content "Big launch today" --accounts id1 --first-comment "Details: https://example.com"

# Schedule directly (skips draft review — only when user explicitly asks)
npx posthive-cli posts:create --content "Hello" --accounts id1 --schedule 2026-07-10T09:00:00Z

# With media (upload first, then reference the returned URL)
npx posthive-cli upload ./image.png
npx posthive-cli posts:create --content "Check this out" --accounts id1 --media https://...returned-url...

# Instagram Reel / Story (media required)
npx posthive-cli posts:create --content "New reel" --accounts ig_id --media <video_url> --media-type reel

# YouTube Short
npx posthive-cli posts:create --content "Title here" --accounts yt_id --media <video_url> --youtube-type short

# Queue management
npx posthive-cli posts:list --status draft
npx posthive-cli posts:get <post_id>
npx posthive-cli posts:update <post_id> --content "Fixed typo"
npx posthive-cli posts:approve <post_id> --schedule 2026-07-10T09:00:00Z
npx posthive-cli posts:duplicate <post_id>
npx posthive-cli posts:delete <post_id>

# Templates
npx posthive-cli templates:list
npx posthive-cli templates:use <template_id> --accounts id1 --content "Optional override"

# Dry run (full pipeline, no real API calls)
npx posthive-cli posts:create --content "Test" --accounts id1 --dry-run
```

## Platform notes

| Platform | Char limit | Notes |
|----------|-----------|-------|
| Bluesky | 300 | |
| Threads | 500 | |
| Mastodon | 500 | |
| X (Twitter) | 280 | Pro/Team plan, no links |
| LinkedIn | 3,000 | Link in first comment performs better |
| Instagram | 2,200 | Image/video required; use --media-type for reel/story |
| YouTube | — | Video required; use --youtube-type short or video |
| Pinterest | 500 | Image required |
| Facebook Pages | 63,206 | |
| Telegram | 4,096 | |
| Nostr | — | |
| Discord | 2,000 | Webhook-based; no first comment |
| Tumblr | — | NPF format; image posts supported |

When posting to multiple platforms at once, keep content within the smallest char limit of the selected platforms, or create separate posts per platform with tailored content.

## Best practices

- Keep a human in the loop: default to drafts, let the user approve.
- Timestamps are ISO 8601 UTC (e.g. `2026-07-10T09:00:00Z`). Confirm the user's timezone before scheduling.
- Put links and hashtag walls in `--first-comment` rather than the main content on LinkedIn and Instagram.
- On errors, the CLI exits non-zero and prints `{"error": "..."}` to stdout.

## Links

- [Posthive](https://posthive.co)
- [Agent docs](https://posthive.co/agent)
- [posthive-cli on npm](https://www.npmjs.com/package/posthive-cli)
- [posthive-mcp on npm](https://www.npmjs.com/package/posthive-mcp) — for Claude Desktop, Cursor, Windsurf (MCP clients instead of shell agents)
