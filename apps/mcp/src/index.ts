#!/usr/bin/env node
/**
 * Posthive MCP Server
 *
 * Exposes Posthive's scheduling API as MCP tools for use with Claude Code,
 * Cursor, or any MCP-compatible agent.
 *
 * Required env vars:
 *   POSTHIVE_API_KEY  — API key from Posthive Settings → API Keys
 *   POSTHIVE_API_URL  — Base URL of your Posthive API (e.g. https://api.posthive.co)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_KEY = process.env.POSTHIVE_API_KEY;
const API_URL = (process.env.POSTHIVE_API_URL ?? "").replace(/\/$/, "");

if (!API_KEY) {
  process.stderr.write("Error: POSTHIVE_API_KEY environment variable is required\n");
  process.exit(1);
}
if (!API_URL) {
  process.stderr.write("Error: POSTHIVE_API_URL environment variable is required\n");
  process.exit(1);
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

async function apiCall(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg =
      (json as Record<string, unknown>)?.error ??
      (json as Record<string, unknown>)?.message ??
      text;
    throw new Error(`API ${res.status}: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
  }

  return json;
}

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "list_accounts",
    description:
      "List all connected social media accounts for this Posthive workspace. " +
      "Returns account IDs, platforms, and display names. Use these IDs when creating posts.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "create_post",
    description:
      "Create a post in Posthive. " +
      "BY DEFAULT posts are saved as DRAFTS and require manual approval in the Posthive review queue before anything is published. " +
      "Nothing is published automatically unless schedule_directly is explicitly set to true with a future scheduled_time. " +
      "Use list_accounts to get valid account IDs before calling this tool.",
    inputSchema: {
      type: "object" as const,
      properties: {
        content: { type: "string", description: "The post text content." },
        account_ids: {
          type: "array",
          items: { type: "string" },
          description: "Array of account IDs to post to. Use list_accounts to get IDs.",
        },
        media_urls: {
          type: "array",
          items: { type: "string" },
          description: "Array of already-uploaded media URLs (images or video). Upload via POST /api/v1/upload first to get URLs.",
        },
        media_type: {
          type: "string",
          enum: ["post", "reel", "story"],
          description: "Instagram media type. 'post' = feed image/carousel, 'reel' = video reel, 'story' = story. Only relevant for Instagram accounts.",
        },
        youtube_type: {
          type: "string",
          enum: ["short", "video"],
          description: "YouTube video type. 'short' = YouTube Short (vertical, ≤60s), 'video' = standard upload. Only relevant for YouTube accounts.",
        },
        first_comment: { type: "string", description: "Optional first comment to fire immediately after the post goes live." },
        scheduled_time: {
          type: "string",
          description: "ISO 8601 datetime for when the post should go live. Required when schedule_directly is true.",
        },
        schedule_directly: {
          type: "boolean",
          description:
            "When true, post is scheduled directly and will publish at scheduled_time without manual approval. " +
            "Requires scheduled_time. Defaults to false (saves as draft).",
        },
        per_account: {
          type: "object",
          description: "Per-account content overrides. Keys are account IDs.",
          additionalProperties: {
            type: "object",
            properties: { text: { type: "string" }, commentText: { type: "string" } },
          },
        },
        dry_run: { type: "boolean", description: "When true, runs the full pipeline without real API calls." },
      },
      required: ["content", "account_ids"],
    },
  },
  {
    name: "get_post",
    description: "Get full details of a single post by ID, including per-platform publish status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        post_id: { type: "string", description: "Post ID from list_scheduled_posts or create_post." },
      },
      required: ["post_id"],
    },
  },
  {
    name: "list_scheduled_posts",
    description: "List upcoming scheduled posts and drafts in the queue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["pending", "draft", "done", "failed"],
          description: "Filter by post status. Omit to return all.",
        },
        limit: { type: "number", description: "Maximum number of posts to return (default 20, max 100)." },
      },
      required: [],
    },
  },
  {
    name: "approve_draft",
    description:
      "Approve a draft post and schedule it for publishing at a specific time. " +
      "Promotes a draft to the scheduled queue — it will publish at scheduled_time without further approval. " +
      "Only works on posts with status 'draft'.",
    inputSchema: {
      type: "object" as const,
      properties: {
        post_id: { type: "string", description: "Post ID of the draft to approve." },
        scheduled_time: { type: "string", description: "ISO 8601 datetime when to publish. Must be in the future." },
      },
      required: ["post_id", "scheduled_time"],
    },
  },
  {
    name: "update_post",
    description: "Update content or scheduled time of a queued or draft post. Only pending/draft posts can be updated.",
    inputSchema: {
      type: "object" as const,
      properties: {
        post_id: { type: "string", description: "The ID of the post to update." },
        content: { type: "string", description: "Updated post text content." },
        scheduled_time: { type: "string", description: "Updated scheduled time (ISO 8601)." },
        first_comment: { type: "string", description: "Updated first comment text." },
        per_account: {
          type: "object",
          description: "Updated per-account content overrides.",
          additionalProperties: {
            type: "object",
            properties: { text: { type: "string" }, commentText: { type: "string" } },
          },
        },
      },
      required: ["post_id"],
    },
  },
  {
    name: "duplicate_post",
    description: "Clone an existing post as a new draft. Copies content, accounts, and per-account overrides.",
    inputSchema: {
      type: "object" as const,
      properties: {
        post_id: { type: "string", description: "Post ID to duplicate." },
      },
      required: ["post_id"],
    },
  },
  {
    name: "delete_post",
    description: "Delete a pending or draft post from the queue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        post_id: { type: "string", description: "The ID of the post to delete." },
      },
      required: ["post_id"],
    },
  },
  {
    name: "list_templates",
    description: "List all saved post templates in this Posthive workspace.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "create_from_template",
    description:
      "Create a draft post using a saved template as the base content. " +
      "You can override the text before saving. Use list_templates to get template IDs.",
    inputSchema: {
      type: "object" as const,
      properties: {
        template_id: { type: "string", description: "Template ID from list_templates." },
        account_ids: {
          type: "array",
          items: { type: "string" },
          description: "Account IDs to post to. Use list_accounts to get IDs.",
        },
        content_override: { type: "string", description: "Override the template text. Leave blank to use template text as-is." },
        first_comment_override: { type: "string", description: "Override the template first comment." },
        schedule_directly: {
          type: "boolean",
          description: "When true, schedule immediately instead of saving as draft. Requires scheduled_time.",
        },
        scheduled_time: { type: "string", description: "ISO 8601 publish time. Required when schedule_directly is true." },
      },
      required: ["template_id", "account_ids"],
    },
  },
];

// ─── Server ───────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "posthive", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const a = (args ?? {}) as Record<string, unknown>;

  try {
    switch (name) {
      case "list_accounts": {
        const data = await apiCall("GET", "/api/v1/accounts");
        return ok(data);
      }

      case "create_post": {
        const scheduleDirectly = a.schedule_directly === true;
        const scheduledTime = a.scheduled_time as string | undefined;

        if (scheduleDirectly && !scheduledTime) {
          throw new Error("scheduled_time is required when schedule_directly is true");
        }

        const body: Record<string, unknown> = {
          content: a.content,
          accountIds: a.account_ids,
          draft: !scheduleDirectly,
          ...(scheduleDirectly && scheduledTime ? { scheduledFor: scheduledTime } : {}),
          ...(a.media_urls ? { images: a.media_urls } : {}),
          ...(a.media_type ? { mediaType: a.media_type } : {}),
          ...(a.youtube_type ? { youtubeType: a.youtube_type } : {}),
          ...(a.first_comment ? { commentText: a.first_comment } : {}),
          ...(a.per_account ? { perAccount: a.per_account } : {}),
          ...(a.dry_run ? { dryRun: true } : {}),
        };

        const data = await apiCall("POST", "/api/v1/posts", body);
        return ok({
          ...(data as object),
          _note: scheduleDirectly
            ? "Post scheduled — will publish at scheduled_time."
            : "Post saved as DRAFT. Use approve_draft to schedule it, or review it in Posthive → Posts.",
        });
      }

      case "get_post": {
        const data = await apiCall("GET", `/api/v1/posts/${a.post_id as string}`);
        return ok(data);
      }

      case "list_scheduled_posts": {
        const params = new URLSearchParams();
        if (a.status) params.set("status", a.status as string);
        if (a.limit) params.set("limit", String(a.limit));
        const qs = params.size ? `?${params}` : "";
        const data = await apiCall("GET", `/api/v1/posts${qs}`);
        return ok(data);
      }

      case "approve_draft": {
        const data = await apiCall("POST", `/api/v1/posts/${a.post_id as string}/approve`, {
          scheduledFor: a.scheduled_time,
        });
        return ok({
          ...(data as object),
          _note: "Draft approved and scheduled. It will publish at the specified time.",
        });
      }

      case "update_post": {
        const { post_id, content, scheduled_time, first_comment, per_account } = a as {
          post_id: string;
          content?: string;
          scheduled_time?: string;
          first_comment?: string;
          per_account?: Record<string, { text?: string; commentText?: string }>;
        };

        const body: Record<string, unknown> = {
          ...(content !== undefined ? { content } : {}),
          ...(scheduled_time !== undefined ? { scheduledFor: scheduled_time } : {}),
          ...(first_comment !== undefined ? { commentText: first_comment } : {}),
          ...(per_account !== undefined ? { perAccount: per_account } : {}),
        };

        if (Object.keys(body).length === 0) {
          throw new Error("Provide at least one field to update");
        }

        const data = await apiCall("PATCH", `/api/v1/posts/${post_id}`, body);
        return ok(data);
      }

      case "duplicate_post": {
        const data = await apiCall("POST", `/api/v1/posts/${a.post_id as string}/duplicate`);
        return ok({
          ...(data as object),
          _note: "Post duplicated as a new draft. Use approve_draft to schedule it.",
        });
      }

      case "delete_post": {
        const data = await apiCall("DELETE", `/api/v1/posts/${a.post_id as string}`);
        return ok(data);
      }

      case "list_templates": {
        const data = await apiCall("GET", "/api/v1/templates");
        return ok(data);
      }

      case "create_from_template": {
        const scheduleDirectly = a.schedule_directly === true;
        const scheduledTime = a.scheduled_time as string | undefined;

        if (scheduleDirectly && !scheduledTime) {
          throw new Error("scheduled_time is required when schedule_directly is true");
        }

        const body: Record<string, unknown> = {
          accountIds: a.account_ids,
          draft: !scheduleDirectly,
          ...(scheduleDirectly && scheduledTime ? { scheduledFor: scheduledTime } : {}),
          ...(a.content_override ? { contentOverride: a.content_override } : {}),
          ...(a.first_comment_override ? { firstCommentOverride: a.first_comment_override } : {}),
        };

        const data = await apiCall("POST", `/api/v1/templates/${a.template_id as string}/use`, body);
        return ok({
          ...(data as object),
          _note: scheduleDirectly
            ? "Post created from template and scheduled."
            : "Post created from template as DRAFT. Use approve_draft to schedule it.",
        });
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
