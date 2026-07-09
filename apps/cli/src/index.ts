#!/usr/bin/env node
/**
 * Posthive CLI
 *
 * Schedule posts to 11 social platforms from the command line or any
 * AI agent that can run shell commands (Claude Code, OpenClaw, Cursor).
 *
 * Every command outputs structured JSON for easy parsing by LLMs and scripts.
 *
 * Required env vars:
 *   POSTHIVE_API_KEY  — API key from Posthive Settings → API Keys
 *   POSTHIVE_API_URL  — Base URL of the Posthive API (default: https://api.posthive.co)
 */

import { readFile } from "node:fs/promises";
import { basename } from "node:path";

const API_KEY = process.env.POSTHIVE_API_KEY;
const API_URL = (process.env.POSTHIVE_API_URL ?? "https://api.posthive.co").replace(/\/$/, "");

// ─── Output helpers ──────────────────────────────────────────────────────────

function out(data: unknown): never {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
  process.exit(0);
}

function fail(message: string, code = 1): never {
  process.stdout.write(JSON.stringify({ error: message }, null, 2) + "\n");
  process.exit(code);
}

// ─── Arg parsing ─────────────────────────────────────────────────────────────

interface Parsed {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): Parsed {
  const [command = "help", ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, flags };
}

function str(flags: Record<string, string | boolean>, key: string): string | undefined {
  const v = flags[key];
  return typeof v === "string" ? v : undefined;
}

function list(flags: Record<string, string | boolean>, key: string): string[] | undefined {
  const v = str(flags, key);
  return v ? v.split(",").map(s => s.trim()).filter(Boolean) : undefined;
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

async function api(method: string, path: string, body?: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    fail(`Cannot reach Posthive API at ${API_URL} — check POSTHIVE_API_URL and your network. (${err instanceof Error ? err.message : String(err)})`);
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const rec = json as Record<string, unknown>;
    const msg = rec?.error ?? rec?.message ?? text;
    fail(`API ${res.status}: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
  }

  return json;
}

// ─── Help text ───────────────────────────────────────────────────────────────

const HELP = {
  usage: "posthive <command> [args] [--flags]",
  env: {
    POSTHIVE_API_KEY: "required — API key from Posthive Settings → API Keys",
    POSTHIVE_API_URL: "optional — API base URL (default: https://api.posthive.co)",
  },
  commands: {
    "accounts:list": "List connected social accounts and their IDs",
    "posts:create": "Create a post. --content <text> --accounts <id,id> [--schedule <ISO>] [--first-comment <text>] [--media <url,url>] [--media-type post|reel|story] [--youtube-type short|video] [--dry-run]. Saved as DRAFT unless --schedule is given.",
    "posts:list": "List posts. [--status pending|draft|done|failed] [--limit <n>]",
    "posts:get": "Get post details. posts:get <post_id>",
    "posts:update": "Update a pending/draft post. posts:update <post_id> [--content <text>] [--schedule <ISO>] [--first-comment <text>]",
    "posts:approve": "Approve a draft and schedule it. posts:approve <post_id> --schedule <ISO>",
    "posts:duplicate": "Clone a post as a new draft. posts:duplicate <post_id>",
    "posts:delete": "Delete a pending/draft post. posts:delete <post_id>",
    "templates:list": "List saved post templates",
    "templates:use": "Create a post from a template. templates:use <template_id> --accounts <id,id> [--content <override>] [--schedule <ISO>]",
    "upload": "Upload an image or video. upload <file_path> — returns a media URL for posts:create --media",
    "help": "Show this help",
  },
  notes: [
    "All output is JSON.",
    "Posts default to DRAFT status — review them in Posthive → Posts, or pass --schedule to schedule directly.",
    "Get account IDs from accounts:list before creating posts.",
  ],
};

// ─── Main ────────────────────────────────────────────────────────────────────

const { command, positional, flags } = parseArgs(process.argv.slice(2));

if (command === "help" || command === "--help" || command === "-h") {
  out(HELP);
}

if (!API_KEY) {
  fail("POSTHIVE_API_KEY environment variable is required. Get a key at Posthive → Settings → API Keys.");
}

switch (command) {
  case "accounts:list": {
    out(await api("GET", "/api/v1/accounts"));
    break;
  }

  case "posts:create": {
    const content = str(flags, "content");
    const accounts = list(flags, "accounts");
    if (!content) fail("--content is required");
    if (!accounts?.length) fail("--accounts is required (comma-separated account IDs; see accounts:list)");

    const schedule = str(flags, "schedule");
    const body: Record<string, unknown> = {
      content,
      accountIds: accounts,
      draft: !schedule,
      ...(schedule ? { scheduledFor: schedule } : {}),
      ...(list(flags, "media") ? { images: list(flags, "media") } : {}),
      ...(str(flags, "media-type") ? { mediaType: str(flags, "media-type") } : {}),
      ...(str(flags, "youtube-type") ? { youtubeType: str(flags, "youtube-type") } : {}),
      ...(str(flags, "first-comment") ? { commentText: str(flags, "first-comment") } : {}),
      ...(flags["dry-run"] === true ? { dryRun: true } : {}),
    };

    const data = await api("POST", "/api/v1/posts", body);
    out({
      ...(data as object),
      _note: schedule
        ? "Post scheduled — will publish at the given time."
        : "Post saved as DRAFT. Approve with posts:approve or review in Posthive → Posts.",
    });
    break;
  }

  case "posts:list": {
    const params = new URLSearchParams();
    const status = str(flags, "status");
    const limit = str(flags, "limit");
    if (status) params.set("status", status);
    if (limit) params.set("limit", limit);
    const qs = params.size ? `?${params}` : "";
    out(await api("GET", `/api/v1/posts${qs}`));
    break;
  }

  case "posts:get": {
    const id = positional[0];
    if (!id) fail("Usage: posthive posts:get <post_id>");
    out(await api("GET", `/api/v1/posts/${encodeURIComponent(id)}`));
    break;
  }

  case "posts:update": {
    const id = positional[0];
    if (!id) fail("Usage: posthive posts:update <post_id> [--content] [--schedule] [--first-comment]");

    const body: Record<string, unknown> = {
      ...(str(flags, "content") !== undefined ? { content: str(flags, "content") } : {}),
      ...(str(flags, "schedule") !== undefined ? { scheduledFor: str(flags, "schedule") } : {}),
      ...(str(flags, "first-comment") !== undefined ? { commentText: str(flags, "first-comment") } : {}),
    };
    if (Object.keys(body).length === 0) {
      fail("Provide at least one of --content, --schedule, --first-comment");
    }
    out(await api("PATCH", `/api/v1/posts/${encodeURIComponent(id)}`, body));
    break;
  }

  case "posts:approve": {
    const id = positional[0];
    const schedule = str(flags, "schedule");
    if (!id) fail("Usage: posthive posts:approve <post_id> --schedule <ISO datetime>");
    if (!schedule) fail("--schedule is required (ISO 8601 datetime, must be in the future)");
    const data = await api("POST", `/api/v1/posts/${encodeURIComponent(id)}/approve`, { scheduledFor: schedule });
    out({ ...(data as object), _note: "Draft approved and scheduled." });
    break;
  }

  case "posts:duplicate": {
    const id = positional[0];
    if (!id) fail("Usage: posthive posts:duplicate <post_id>");
    const data = await api("POST", `/api/v1/posts/${encodeURIComponent(id)}/duplicate`);
    out({ ...(data as object), _note: "Duplicated as a new draft." });
    break;
  }

  case "posts:delete": {
    const id = positional[0];
    if (!id) fail("Usage: posthive posts:delete <post_id>");
    out(await api("DELETE", `/api/v1/posts/${encodeURIComponent(id)}`));
    break;
  }

  case "templates:list": {
    out(await api("GET", "/api/v1/templates"));
    break;
  }

  case "templates:use": {
    const id = positional[0];
    const accounts = list(flags, "accounts");
    if (!id) fail("Usage: posthive templates:use <template_id> --accounts <id,id>");
    if (!accounts?.length) fail("--accounts is required (comma-separated account IDs)");

    const schedule = str(flags, "schedule");
    const body: Record<string, unknown> = {
      accountIds: accounts,
      draft: !schedule,
      ...(schedule ? { scheduledFor: schedule } : {}),
      ...(str(flags, "content") ? { contentOverride: str(flags, "content") } : {}),
      ...(str(flags, "first-comment") ? { firstCommentOverride: str(flags, "first-comment") } : {}),
    };
    const data = await api("POST", `/api/v1/templates/${encodeURIComponent(id)}/use`, body);
    out({
      ...(data as object),
      _note: schedule ? "Post created from template and scheduled." : "Post created from template as DRAFT.",
    });
    break;
  }

  case "upload": {
    const filePath = positional[0];
    if (!filePath) fail("Usage: posthive upload <file_path>");

    let buf: Buffer;
    try {
      buf = await readFile(filePath);
    } catch {
      fail(`Cannot read file: ${filePath}`);
    }

    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(buf)]), basename(filePath));

    let res: Response;
    try {
      res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${API_KEY}` },
        body: form,
      });
    } catch (err) {
      fail(`Cannot reach Posthive API at ${API_URL} — check POSTHIVE_API_URL and your network. (${err instanceof Error ? err.message : String(err)})`);
    }

    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    if (!res.ok) {
      fail(`Upload failed (${res.status}): ${text}`);
    }
    out(json);
    break;
  }

  default:
    fail(`Unknown command: ${command}. Run "posthive help" for usage.`);
}
