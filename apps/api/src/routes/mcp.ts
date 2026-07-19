/**
 * Posthive MCP — HTTP/SSE connector endpoint
 *
 * Implements the MCP Streamable HTTP transport so Claude.ai custom connectors,
 * Cursor, and any HTTP-capable MCP client can drive Posthive without a local
 * binary.
 *
 * Endpoint: POST /mcp
 * Auth:     Authorization: Bearer ph_...  (same API key as REST API)
 *
 * All agent-created posts default to draft=true. Nothing publishes without
 * the user's explicit approval in the Posthive review queue.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { prisma } from "../lib/prisma.js";
import { schedulePostJob } from "../lib/queue.js";
import { withApiKey, canUseApi } from "../lib/auth/withApiKey.js";

async function withMcpGate(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = req.apiKeyUser!;
  if (!canUseApi(user.plan, user.planStatus)) {
    return reply.status(403).send({
      error: "MCP access requires a Pro or Team plan. Upgrade at posthive.co/billing",
    });
  }
}

// ─── Tools ────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "list_accounts",
    description:
      "List all connected social media accounts for this Posthive workspace. " +
      "Returns account IDs, platforms, and display names. Use these IDs when creating posts.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
    outputSchema: {
      type: "object" as const,
      properties: {
        accounts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id:          { type: "string" },
              platform:    { type: "string" },
              displayName: { type: "string" },
              avatarUrl:   { type: ["string", "null"] },
              createdAt:   { type: "string" },
            },
          },
        },
      },
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
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
          description: "Array of account IDs. Use list_accounts to get IDs.",
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
        first_comment: { type: "string", description: "Optional first comment to fire after the post goes live." },
        scheduled_time: {
          type: "string",
          description: "ISO 8601 datetime for publish time. Required when schedule_directly is true.",
        },
        schedule_directly: {
          type: "boolean",
          description:
            "When true, post is scheduled directly and publishes at scheduled_time without manual approval. " +
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
        dry_run: { type: "boolean", description: "Full pipeline test without real API calls." },
      },
      required: ["content", "account_ids"],
    },
    outputSchema: {
      type: "object" as const,
      properties: {
        id:          { type: "string" },
        status:      { type: "string", enum: ["draft", "pending", "done", "failed"] },
        draft:       { type: "boolean" },
        scheduledFor:{ type: ["string", "null"] },
        targets:     { type: "array", items: { type: "object", properties: { id: { type: "string" }, accountId: { type: "string" }, status: { type: "string" } } } },
        _note:       { type: "string" },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
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
    outputSchema: {
      type: "object" as const,
      properties: {
        id:          { type: "string" },
        status:      { type: "string" },
        draft:       { type: "boolean" },
        scheduledFor:{ type: ["string", "null"] },
        content:     { type: "string" },
        firstComment:{ type: ["string", "null"] },
        perAccount:  { type: ["object", "null"] },
        createdAt:   { type: "string" },
        targets: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id:          { type: "string" },
              platform:    { type: "string" },
              displayName: { type: "string" },
              status:      { type: "string" },
              error:       { type: ["string", "null"] },
            },
          },
        },
      },
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
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
          description: "Filter by status. Omit to return all.",
        },
        limit: { type: "number", description: "Max results (default 20, max 100)." },
      },
      required: [],
    },
    outputSchema: {
      type: "object" as const,
      properties: {
        posts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id:          { type: "string" },
              status:      { type: "string" },
              scheduledFor:{ type: ["string", "null"] },
              draft:       { type: "boolean" },
              content:     { type: "string" },
              platforms:   { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "approve_draft",
    description:
      "Approve a draft post and schedule it for publishing at a specific time. " +
      "This promotes a draft to the scheduled queue — it will publish at scheduled_time without further approval needed. " +
      "Only works on posts with status 'draft'.",
    inputSchema: {
      type: "object" as const,
      properties: {
        post_id: { type: "string", description: "Post ID of the draft to approve." },
        scheduled_time: { type: "string", description: "ISO 8601 datetime when to publish. Must be in the future." },
      },
      required: ["post_id", "scheduled_time"],
    },
    outputSchema: {
      type: "object" as const,
      properties: {
        id:          { type: "string" },
        status:      { type: "string" },
        scheduledFor:{ type: "string" },
        _note:       { type: "string" },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: "update_post",
    description: "Update content or scheduled time of a queued or draft post. Only pending/draft posts can be updated.",
    inputSchema: {
      type: "object" as const,
      properties: {
        post_id: { type: "string", description: "Post ID from list_scheduled_posts." },
        content: { type: "string" },
        scheduled_time: { type: "string", description: "New scheduled time (ISO 8601)." },
        first_comment: { type: "string" },
        per_account: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: { text: { type: "string" }, commentText: { type: "string" } },
          },
        },
      },
      required: ["post_id"],
    },
    outputSchema: {
      type: "object" as const,
      properties: {
        id:          { type: "string" },
        status:      { type: "string" },
        scheduledFor:{ type: ["string", "null"] },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
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
    outputSchema: {
      type: "object" as const,
      properties: {
        id:          { type: "string" },
        status:      { type: "string" },
        draft:       { type: "boolean" },
        scheduledFor:{ type: "null" },
        targets:     { type: "array", items: { type: "object", properties: { id: { type: "string" }, accountId: { type: "string" }, status: { type: "string" } } } },
        _note:       { type: "string" },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "delete_post",
    description: "Delete a pending or draft post from the queue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        post_id: { type: "string", description: "Post ID from list_scheduled_posts." },
      },
      required: ["post_id"],
    },
    outputSchema: {
      type: "object" as const,
      properties: {
        ok:      { type: "boolean" },
        deleted: { type: "string" },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  },
  {
    name: "list_templates",
    description: "List all saved post templates in this Posthive workspace.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
    outputSchema: {
      type: "object" as const,
      properties: {
        templates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id:           { type: "string" },
              name:         { type: "string" },
              text:         { type: "string" },
              firstComment: { type: ["string", "null"] },
              createdAt:    { type: "string" },
              updatedAt:    { type: "string" },
            },
          },
        },
      },
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "create_from_template",
    description:
      "Create a draft post using a saved template as the base content. " +
      "You can override the text and other fields before saving. " +
      "Use list_templates to get template IDs.",
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
    outputSchema: {
      type: "object" as const,
      properties: {
        id:           { type: "string" },
        status:       { type: "string" },
        draft:        { type: "boolean" },
        scheduledFor: { type: ["string", "null"] },
        templateUsed: { type: "string" },
        targets:      { type: "array", items: { type: "object", properties: { id: { type: "string" }, accountId: { type: "string" }, status: { type: "string" } } } },
        _note:        { type: "string" },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
];

// ─── Tool handler ─────────────────────────────────────────────────────────────

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

async function handleTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
  workspaceId: string
) {
  switch (name) {
    case "list_accounts": {
      const accounts = await prisma.account.findMany({
        where: { workspaceId },
        select: { id: true, platform: true, displayName: true, avatarUrl: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });
      return ok({ accounts });
    }

    case "create_post": {
      const scheduleDirectly = args.schedule_directly === true;
      const scheduledTimeStr = args.scheduled_time as string | undefined;

      if (scheduleDirectly && !scheduledTimeStr) {
        throw new Error("scheduled_time is required when schedule_directly is true");
      }

      let scheduledFor: Date;
      if (scheduleDirectly && scheduledTimeStr) {
        scheduledFor = new Date(scheduledTimeStr);
        if (isNaN(scheduledFor.getTime()) || scheduledFor <= new Date()) {
          throw new Error("scheduled_time must be a future ISO date string");
        }
      } else {
        scheduledFor = new Date(0);
      }

      const accountIds = args.account_ids as string[];
      const accounts = await prisma.account.findMany({
        where: { id: { in: accountIds }, workspaceId },
        select: { id: true },
      });
      if (accounts.length !== accountIds.length) {
        throw new Error("One or more account_ids are invalid or do not belong to your workspace");
      }

      const isDraft = !scheduleDirectly;
      const contentPayload = JSON.stringify({
        text: args.content,
        mediaUrls: (args.media_urls as string[] | undefined) ?? [],
        ...(args.media_type ? { mediaType: args.media_type } : {}),
        ...(args.youtube_type ? { youtubeType: args.youtube_type } : {}),
        ...(args.per_account ? { perAccount: args.per_account } : {}),
      });

      const job = await prisma.postJob.create({
        data: {
          userId,
          workspaceId,
          scheduledFor,
          status: isDraft ? "draft" : "pending",
          content: contentPayload,
          commentText: (args.first_comment as string | undefined) ?? null,
          dryRun: args.dry_run === true,
          targets: { create: accountIds.map((accountId) => ({ accountId })) },
        },
        include: { targets: { select: { id: true, accountId: true, status: true } } },
      });

      if (!isDraft) await schedulePostJob(job.id, scheduledFor);

      return ok({
        id: job.id,
        status: job.status,
        draft: isDraft,
        scheduledFor: isDraft ? null : job.scheduledFor,
        targets: job.targets,
        _note: isDraft
          ? "Post saved as DRAFT. Open Posthive → Posts to review and schedule, or use approve_draft to schedule it now."
          : "Post scheduled — will publish at scheduled_time.",
      });
    }

    case "get_post": {
      const postId = args.post_id as string;
      const job = await prisma.postJob.findUnique({
        where: { id: postId },
        include: {
          targets: {
            select: {
              id: true,
              status: true,
              error: true,
              account: { select: { platform: true, displayName: true } },
            },
          },
        },
      });
      if (!job || job.workspaceId !== workspaceId) throw new Error("Post not found");

      const parsed = (() => { try { return JSON.parse(job.content) as Record<string, unknown>; } catch { return {}; } })();
      return ok({
        id: job.id,
        status: job.status,
        draft: job.status === "draft",
        scheduledFor: job.status === "draft" ? null : job.scheduledFor,
        content: (parsed.text as string) ?? "",
        firstComment: job.commentText,
        perAccount: parsed.perAccount ?? null,
        createdAt: job.createdAt,
        targets: job.targets.map((t) => ({
          id: t.id,
          platform: t.account.platform,
          displayName: t.account.displayName,
          status: t.status,
          error: t.error ?? null,
        })),
      });
    }

    case "list_scheduled_posts": {
      const status = args.status as string | undefined;
      const take = Math.min(Number(args.limit ?? 20), 100);
      const jobs = await prisma.postJob.findMany({
        where: { workspaceId, ...(status ? { status } : {}) },
        orderBy: { scheduledFor: "desc" },
        take,
        include: {
          targets: {
            select: {
              id: true, status: true,
              account: { select: { platform: true, displayName: true } },
            },
          },
        },
      });
      return ok({
        posts: jobs.map((j) => ({
          id: j.id,
          status: j.status,
          scheduledFor: j.status === "draft" ? null : j.scheduledFor,
          draft: j.status === "draft",
          content: (() => { try { return (JSON.parse(j.content) as { text?: string }).text ?? ""; } catch { return ""; } })(),
          platforms: j.targets.map((t) => t.account.platform),
          targets: j.targets,
        })),
      });
    }

    case "approve_draft": {
      const postId = args.post_id as string;
      const scheduledTimeStr = args.scheduled_time as string;

      const scheduledFor = new Date(scheduledTimeStr);
      if (isNaN(scheduledFor.getTime()) || scheduledFor <= new Date()) {
        throw new Error("scheduled_time must be a future ISO date string");
      }

      const job = await prisma.postJob.findUnique({ where: { id: postId } });
      if (!job || job.workspaceId !== workspaceId) throw new Error("Post not found");
      if (job.status !== "draft") {
        throw new Error(`Post status is '${job.status}' — only drafts can be approved`);
      }

      const updated = await prisma.postJob.update({
        where: { id: postId },
        data: { status: "pending", scheduledFor },
      });
      await schedulePostJob(updated.id, scheduledFor);

      return ok({
        id: updated.id,
        status: updated.status,
        scheduledFor: updated.scheduledFor,
        _note: "Draft approved and scheduled. It will publish at the specified time.",
      });
    }

    case "update_post": {
      const postId = args.post_id as string;
      const job = await prisma.postJob.findUnique({ where: { id: postId } });
      if (!job || job.workspaceId !== workspaceId) throw new Error("Post not found");
      if (job.status !== "pending" && job.status !== "draft") {
        throw new Error(`Cannot update a post with status '${job.status}'. Only pending or draft posts can be updated.`);
      }

      const existing = (() => { try { return JSON.parse(job.content) as Record<string, unknown>; } catch { return {} as Record<string, unknown>; } })();
      const updateData: Record<string, unknown> = {};

      if (args.content !== undefined) {
        updateData.content = JSON.stringify({ ...existing, text: args.content });
      }
      if (args.per_account !== undefined) {
        const parsed = (() => { try { return JSON.parse(job.content) as Record<string, unknown>; } catch { return {} as Record<string, unknown>; } })();
        updateData.content = JSON.stringify({ ...parsed, perAccount: args.per_account });
      }
      if (args.first_comment !== undefined) updateData.commentText = args.first_comment;
      if (args.scheduled_time !== undefined) {
        const d = new Date(args.scheduled_time as string);
        if (isNaN(d.getTime()) || d <= new Date()) throw new Error("scheduled_time must be a future date");
        updateData.scheduledFor = d;
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error("Provide at least one field to update");
      }

      const updated = await prisma.postJob.update({ where: { id: postId }, data: updateData });
      return ok({ id: updated.id, status: updated.status, scheduledFor: updated.scheduledFor });
    }

    case "duplicate_post": {
      const postId = args.post_id as string;
      const job = await prisma.postJob.findUnique({
        where: { id: postId },
        include: { targets: { select: { accountId: true } } },
      });
      if (!job || job.workspaceId !== workspaceId) throw new Error("Post not found");

      const duplicate = await prisma.postJob.create({
        data: {
          userId,
          workspaceId,
          scheduledFor: new Date(0),
          status: "draft",
          content: job.content,
          commentText: job.commentText,
          dryRun: false,
          targets: { create: job.targets.map((t) => ({ accountId: t.accountId })) },
        },
        include: { targets: { select: { id: true, accountId: true, status: true } } },
      });

      return ok({
        id: duplicate.id,
        status: duplicate.status,
        draft: true,
        scheduledFor: null,
        targets: duplicate.targets,
        _note: "Post duplicated as a new draft. Use approve_draft to schedule it.",
      });
    }

    case "delete_post": {
      const postId = args.post_id as string;
      const job = await prisma.postJob.findUnique({ where: { id: postId } });
      if (!job || job.workspaceId !== workspaceId) throw new Error("Post not found");
      if (job.status !== "pending" && job.status !== "draft") {
        throw new Error(`Cannot delete a post with status '${job.status}'. Only pending or draft posts can be deleted.`);
      }
      await prisma.postJob.delete({ where: { id: postId } });
      return ok({ ok: true, deleted: postId });
    }

    case "list_templates": {
      const templates = await prisma.template.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, content: true, createdAt: true, updatedAt: true },
      });
      return ok({
        templates: templates.map((t) => {
          const c = (() => { try { return JSON.parse(t.content) as Record<string, unknown>; } catch { return {}; } })();
          return {
            id: t.id,
            name: t.name,
            text: (c.text as string) ?? "",
            firstComment: (c.commentText as string) ?? null,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          };
        }),
      });
    }

    case "create_from_template": {
      const templateId = args.template_id as string;
      const template = await prisma.template.findFirst({ where: { id: templateId, workspaceId } });
      if (!template) throw new Error("Template not found");

      const tc = (() => { try { return JSON.parse(template.content) as Record<string, unknown>; } catch { return {}; } })();

      const scheduleDirectly = args.schedule_directly === true;
      const scheduledTimeStr = args.scheduled_time as string | undefined;

      if (scheduleDirectly && !scheduledTimeStr) {
        throw new Error("scheduled_time is required when schedule_directly is true");
      }

      let scheduledFor: Date;
      if (scheduleDirectly && scheduledTimeStr) {
        scheduledFor = new Date(scheduledTimeStr);
        if (isNaN(scheduledFor.getTime()) || scheduledFor <= new Date()) {
          throw new Error("scheduled_time must be a future ISO date string");
        }
      } else {
        scheduledFor = new Date(0);
      }

      const accountIds = args.account_ids as string[];
      const accounts = await prisma.account.findMany({
        where: { id: { in: accountIds }, workspaceId },
        select: { id: true },
      });
      if (accounts.length !== accountIds.length) {
        throw new Error("One or more account_ids are invalid or do not belong to your workspace");
      }

      const isDraft = !scheduleDirectly;
      const text = (args.content_override as string | undefined) ?? (tc.text as string) ?? "";
      const commentText = (args.first_comment_override as string | undefined) ?? (tc.commentText as string | undefined) ?? null;

      const contentPayload = JSON.stringify({
        ...tc,
        text,
        commentText,
      });

      const job = await prisma.postJob.create({
        data: {
          userId,
          workspaceId,
          scheduledFor,
          status: isDraft ? "draft" : "pending",
          content: contentPayload,
          commentText,
          dryRun: false,
          targets: { create: accountIds.map((accountId) => ({ accountId })) },
        },
        include: { targets: { select: { id: true, accountId: true, status: true } } },
      });

      if (!isDraft) await schedulePostJob(job.id, scheduledFor);

      return ok({
        id: job.id,
        status: job.status,
        draft: isDraft,
        scheduledFor: isDraft ? null : job.scheduledFor,
        templateUsed: template.name,
        targets: job.targets,
        _note: isDraft
          ? "Post created from template as DRAFT. Use approve_draft to schedule it."
          : "Post created from template and scheduled.",
      });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── Shared MCP handler ───────────────────────────────────────────────────────

async function serveMcp(req: FastifyRequest, reply: FastifyReply, userId: string, workspaceId: string) {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  const server = new Server(
    { name: "posthive", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (mcpReq) => {
    const { name, arguments: args } = mcpReq.params;
    const a = (args ?? {}) as Record<string, unknown>;
    try {
      return await handleTool(name, a, userId, workspaceId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  reply.hijack();
  await server.connect(transport);
  await transport.handleRequest(req.raw, reply.raw, req.body);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function mcpRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /mcp — Bearer token auth (used by Claude.ai OAuth connector) ────────
  app.post(
    "/mcp",
    { preHandler: [withApiKey, withMcpGate], config: { rawBody: true, rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      await serveMcp(req, reply, req.apiKeyUser!.id, req.apiKeyUser!.workspaceId);
    }
  );

  // ── POST /mcp/:apiKey — key-in-URL (Cursor, Claude Code, any HTTP MCP client)
  // One URL to copy-paste — no headers, no config files beyond the URL itself.
  app.post(
    "/mcp/:apiKey",
    { config: { rawBody: true, rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { apiKey } = req.params as { apiKey: string };

      // Reuse withApiKey logic by injecting the key as a Bearer header on the raw request
      req.headers.authorization = `Bearer ${apiKey}`;
      await withApiKey(req, reply);
      if (reply.sent) return; // withApiKey already replied with 401

      await withMcpGate(req, reply);
      if (reply.sent) return;

      await serveMcp(req, reply, req.apiKeyUser!.id, req.apiKeyUser!.workspaceId);
    }
  );

  app.get("/mcp", async (_req, reply) => {
    return reply.send({
      name: "Posthive MCP",
      transport: "streamable-http",
      endpoints: {
        bearer: "POST /mcp  (Authorization: Bearer ph_...)",
        url_key: "POST /mcp/:apiKey",
      },
      docs: "https://posthive.co/docs#mcp-overview",
    });
  });

  app.get("/mcp/:apiKey", async (_req, reply) => {
    return reply.send({
      name: "Posthive MCP",
      transport: "streamable-http",
      endpoint: "POST /mcp/:apiKey",
      docs: "https://posthive.co/docs#mcp-overview",
    });
  });
}
