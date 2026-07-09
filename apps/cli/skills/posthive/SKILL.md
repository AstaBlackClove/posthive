---
name: posthive
description: Schedule social media posts to 11 platforms (Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook Pages, Pinterest, Telegram, X/Twitter, Nostr) via the Posthive CLI. Use when the user asks to create, schedule, list, update, or delete social media posts, or manage their posting queue.
---

# Posthive — social media scheduling

Schedule posts to 11 social platforms from the command line. Every command outputs structured JSON.

## Setup

Requires two environment variables:

```bash
export POSTHIVE_API_KEY=ph_xxx        # Posthive → Settings → API Keys (Pro/Team plan)
export POSTHIVE_API_URL=https://api.posthive.co   # or your self-hosted URL
```

Run commands with `npx posthive-cli` or `posthive` if installed globally (`npm i -g posthive-cli`).

## Workflow

1. **Always start with `accounts:list`** to get valid account IDs — never guess IDs.
2. Create posts with `posts:create`. **Posts are saved as DRAFTS by default** — the user reviews them in Posthive before anything publishes. Only pass `--schedule` when the user explicitly asks to schedule directly.
3. Use `posts:approve` to promote a draft to the scheduled queue.

## Commands

```bash
# List connected accounts (do this first)
posthive accounts:list

# Create a draft post
posthive posts:create --content "Hello world" --accounts id1,id2

# Create with first comment (link/hashtags go here, not the caption)
posthive posts:create --content "Big launch today" --accounts id1 --first-comment "Details: https://example.com"

# Schedule directly (skips draft review — only when user explicitly asks)
posthive posts:create --content "Hello" --accounts id1 --schedule 2026-07-10T09:00:00Z

# With media (upload first, then reference the returned URL)
posthive upload ./image.png
posthive posts:create --content "Check this out" --accounts id1 --media https://...returned-url...

# Instagram Reel / Story (media required)
posthive posts:create --content "New reel" --accounts ig_id --media <video_url> --media-type reel

# YouTube Short
posthive posts:create --content "Title here" --accounts yt_id --media <video_url> --youtube-type short

# Queue management
posthive posts:list --status draft
posthive posts:get <post_id>
posthive posts:update <post_id> --content "Fixed typo"
posthive posts:approve <post_id> --schedule 2026-07-10T09:00:00Z
posthive posts:duplicate <post_id>
posthive posts:delete <post_id>

# Templates
posthive templates:list
posthive templates:use <template_id> --accounts id1 --content "Optional override"

# Dry run (full pipeline, no real API calls)
posthive posts:create --content "Test" --accounts id1 --dry-run
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

When posting to multiple platforms at once, keep content within the smallest char limit of the selected platforms, or create separate posts per platform with tailored content.

## Best practices

- Keep a human in the loop: default to drafts, let the user approve.
- Timestamps are ISO 8601 UTC (e.g. `2026-07-10T09:00:00Z`). Confirm the user's timezone before scheduling.
- Put links and hashtag walls in `--first-comment` rather than the main content on LinkedIn and Instagram.
- On errors, the CLI exits non-zero and prints `{"error": "..."}` to stdout.
