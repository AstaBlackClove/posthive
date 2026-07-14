# posthive-mcp

MCP server for [Posthive](https://posthive.co) — schedule posts to multiple social platforms directly from Claude, Cursor, Windsurf, or any MCP-compatible AI agent.

**Supported platforms:** Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook Pages, Pinterest, Telegram, X (Twitter), Nostr

---

## Quick start

Sign in once with [`posthive-cli`](https://www.npmjs.com/package/posthive-cli) and this MCP server picks up the same login automatically — no API key needed:

```bash
npx posthive-cli login
```

That's it. If you'd rather use an API key directly (CI, self-hosted, or without installing the CLI), generate one at [posthive.co](https://posthive.co) → Settings → API Keys (Pro/Team plan) and set `POSTHIVE_API_KEY` as shown below — it always overrides the stored login.

### Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "posthive": {
      "command": "npx",
      "args": ["posthive-mcp"],
      "env": {
        "POSTHIVE_API_KEY": "ph_your_key_here"
      }
    }
  }
}
```

### Claude Code (CLI)

```bash
claude mcp add posthive -e POSTHIVE_API_KEY=ph_xxx -- npx posthive-mcp
```

### Cursor / Windsurf

Add to your MCP config (`.cursor/mcp.json` or `.windsurf/mcp.json`):

```json
{
  "mcpServers": {
    "posthive": {
      "command": "npx",
      "args": ["posthive-mcp"],
      "env": {
        "POSTHIVE_API_KEY": "ph_your_key_here"
      }
    }
  }
}
```

### Self-hosted Posthive

Set `POSTHIVE_API_URL` to your own API URL (e.g. `http://localhost:3001`). Omit it to use the hosted Posthive API at `https://api.posthive.co`.

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTHIVE_API_KEY` | No, if logged in via `posthive-cli login` | API key from Posthive Settings → API Keys. Overrides the stored login when set. |
| `POSTHIVE_API_URL` | No | Base URL of your Posthive API. Defaults to `https://api.posthive.co`. Set this only for self-hosted deployments. |

---

## Available tools

| Tool | What it does |
|------|-------------|
| `list_accounts` | List all connected social accounts and their IDs |
| `create_post` | Create a post (saved as draft by default) |
| `get_post` | Get full details and publish status of a post |
| `list_scheduled_posts` | List upcoming scheduled posts and drafts |
| `approve_draft` | Approve a draft and schedule it for publishing |
| `update_post` | Edit content or scheduled time of a pending post |
| `duplicate_post` | Clone a post as a new draft |
| `delete_post` | Delete a pending or draft post |
| `list_templates` | List saved post templates |
| `create_from_template` | Create a post from a template |

### Draft-first by default

All posts created via MCP are saved as **drafts** unless you explicitly pass `schedule_directly: true`. Drafts show up in Posthive → Posts for review before anything goes live. Use `approve_draft` to promote a draft to the scheduled queue.

---

## Example prompts

```
Schedule a Bluesky post about our new feature launch for tomorrow at 9 AM.

Draft a LinkedIn post summarising this article and add a link in the first comment.

List all my pending posts for this week.

Duplicate last week's top post and reschedule it for Monday.

Create posts for all my accounts announcing today's product update.
```

---

## Links

- [Posthive](https://posthive.co)
- [Documentation](https://posthive.co/docs#mcp-overview)
- [For Developers](https://posthive.co/for-developers)
- [GitHub](https://github.com/AstaBlackClove/posthive)
- [Issues](https://github.com/AstaBlackClove/posthive/issues)

---

## License

AGPL-3.0 — see [LICENSE](https://github.com/AstaBlackClove/posthive/blob/main/LICENSE) for details.
