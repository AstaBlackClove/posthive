# posthive-cli

Posthive CLI — schedule posts to multiple social platforms from the command line or any AI agent that can run shell commands (Claude Code, OpenClaw, Cursor, custom pipelines).

**Supported platforms:** Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook Pages, Pinterest, Telegram, X (Twitter), Nostr

Every command outputs structured JSON, so LLMs and scripts can parse results directly.

---

## Install

```bash
npm i -g posthive-cli
# or run without installing
npx posthive-cli help
```

## Setup

Sign in once with your browser — no API key copy-pasting:

```bash
posthive login
```

This opens your browser to sign in to Posthive, then stores credentials in `~/.posthive/config.json`. Run `posthive logout` to sign out, or `posthive whoami` to check who's currently logged in.

Self-hosted Posthive: `posthive login --api-url http://localhost:3001`

Prefer env vars (CI, scripts, or a manually generated key from Settings → API Keys)? They always take priority over the stored login:

```bash
export POSTHIVE_API_KEY=ph_your_key_here

# Optional — only needed for self-hosted Posthive. Defaults to https://api.posthive.co
export POSTHIVE_API_URL=http://localhost:3001
```

## Usage

```bash
# List connected accounts (start here — you need account IDs)
posthive accounts:list

# Create a draft post (default: drafts require approval before publishing)
posthive posts:create --content "Hello world" --accounts acc_1,acc_2

# Schedule directly
posthive posts:create --content "Launch day!" --accounts acc_1 --schedule 2026-07-10T09:00:00Z

# First comment automation
posthive posts:create --content "We shipped something big" --accounts acc_1 \
  --first-comment "Full details: https://example.com"

# Upload media, then attach it
posthive upload ./screenshot.png
posthive posts:create --content "Sneak peek" --accounts acc_1 --media <returned_url>

# Manage the queue
posthive posts:list --status draft
posthive posts:get <post_id>
posthive posts:update <post_id> --content "Fixed typo"
posthive posts:approve <post_id> --schedule 2026-07-10T09:00:00Z
posthive posts:duplicate <post_id>
posthive posts:delete <post_id>

# Templates
posthive templates:list
posthive templates:use <template_id> --accounts acc_1

# Full command reference
posthive help
```

## Use with AI agents

The package ships with a [skill](./skills/posthive/SKILL.md) that teaches agents the full command set, platform character limits, and draft-first workflow. Works with Claude Code, OpenClaw, and any agent framework that supports skills or shell execution.

Posts created by agents default to **drafts** — nothing publishes without approval unless `--schedule` is passed explicitly. Human in the loop by design.

Prefer MCP? Use [`posthive-mcp`](https://www.npmjs.com/package/posthive-mcp) for Claude Desktop, Cursor, and other MCP clients.

## Links

- [Posthive](https://posthive.co)
- [Documentation](https://posthive.co/docs)
- [For Developers](https://posthive.co/for-developers)
- [GitHub](https://github.com/AstaBlackClove/posthive)

## License

AGPL-3.0
