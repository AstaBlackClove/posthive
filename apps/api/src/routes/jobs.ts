/**
 * PostJob routes.
 *
 * POST  /jobs        — create and schedule a new job
 * GET   /jobs        — list all jobs with target statuses
 * GET   /jobs/:id    — single job detail
 * PATCH /jobs/:id    — reschedule a pending job (calendar drag-and-drop)
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { schedulePostJob, postJobQueue } from "../lib/queue.js";

const createJobBody = z.object({
  scheduledFor: z.string().datetime(), // ISO 8601
  content: z.object({
    text: z.string().min(1),
    mediaUrls: z.array(z.string()).default([]),
  }),
  commentText: z.string().optional(),
  accountIds: z.array(z.string().cuid()).min(1),
  // When true: skips real API calls, simulates success. Tests the full flow.
  dryRun: z.boolean().default(false),
});

export async function jobRoutes(app: FastifyInstance): Promise<void> {
  // Create a new scheduled job
  app.post("/jobs", async (req, reply) => {
    const parsed = createJobBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const { scheduledFor, content, commentText, accountIds, dryRun } = parsed.data;

    // Verify all accountIds exist
    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds } },
      select: { id: true },
    });
    if (accounts.length !== accountIds.length) {
      return reply.status(400).send({ error: "One or more accountIds not found" });
    }

    const job = await prisma.postJob.create({
      data: {
        scheduledFor: new Date(scheduledFor),
        content: JSON.stringify(content),
        commentText: commentText ?? null,
        dryRun,
        targets: {
          create: accountIds.map((accountId) => ({ accountId })),
        },
      },
      include: {
        targets: { select: { id: true, accountId: true, status: true } },
      },
    });

    // Add to BullMQ queue with exact delay — fires at scheduledFor time
    await schedulePostJob(job.id, new Date(scheduledFor));

    return reply.status(201).send(job);
  });

  // SSE stream — pushes job list whenever data changes (client holds one connection)
  app.get("/jobs/stream", async (req, reply) => {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering
    });

    const fetchJobs = async () => {
      const jobs = await prisma.postJob.findMany({
        orderBy: { scheduledFor: "desc" },
        include: {
          targets: {
            select: {
              id: true,
              accountId: true,
              status: true,
              platformPostId: true,
              error: true,
              attempts: true,
              account: { select: { platform: true, displayName: true } },
            },
          },
        },
      });
      return JSON.stringify(jobs);
    };

    // Send immediately on connect
    let lastPayload = "";
    try {
      lastPayload = await fetchJobs();
      reply.raw.write(`data: ${lastPayload}\n\n`);
    } catch { /* ignore — client will retry */ }

    // Poll DB every 3s, only push when data changed
    const poll = setInterval(async () => {
      try {
        const payload = await fetchJobs();
        if (payload !== lastPayload) {
          lastPayload = payload;
          reply.raw.write(`data: ${payload}\n\n`);
        }
      } catch { /* ignore */ }
    }, 3000);

    // Keepalive ping every 25s so proxies/load balancers don't close idle connections
    const keepAlive = setInterval(() => {
      reply.raw.write(": ping\n\n");
    }, 25000);

    req.raw.on("close", () => {
      clearInterval(poll);
      clearInterval(keepAlive);
    });

    // Never resolve — connection stays open until client closes it
    await new Promise<void>((resolve) => req.raw.on("close", resolve));
  });

  // List all jobs
  app.get("/jobs", async (_req, reply) => {
    const jobs = await prisma.postJob.findMany({
      orderBy: { scheduledFor: "desc" },
      include: {
        targets: {
          select: {
            id: true,
            accountId: true,
            status: true,
            platformPostId: true,
            error: true,
            attempts: true,
            account: { select: { platform: true, displayName: true } },
          },
        },
      },
    });
    return reply.send(jobs);
  });

  // Single job detail
  app.get("/jobs/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = await prisma.postJob.findUnique({
      where: { id },
      include: {
        targets: {
          select: {
            id: true,
            accountId: true,
            status: true,
            platformPostId: true,
            error: true,
            attempts: true,
            account: { select: { platform: true, displayName: true } },
          },
        },
      },
    });

    if (!job) return reply.status(404).send({ error: "Job not found" });
    return reply.send(job);
  });

  // Reschedule a pending job — used by calendar drag-and-drop
  app.patch("/jobs/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({ scheduledFor: z.string().datetime() }).safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() });
    }

    const job = await prisma.postJob.findUnique({ where: { id }, select: { status: true } });
    if (!job) return reply.status(404).send({ error: "Job not found" });

    // Only pending jobs can be rescheduled — running/done/failed cannot
    if (job.status !== "pending") {
      return reply.status(409).send({ error: `Cannot reschedule a job with status "${job.status}"` });
    }

    const newScheduledFor = new Date(body.data.scheduledFor);

    const updated = await prisma.postJob.update({
      where: { id },
      data: { scheduledFor: newScheduledFor },
    });

    // Remove the old BullMQ job and re-add with new delay
    await postJobQueue.remove(id);
    await schedulePostJob(id, newScheduledFor);

    return reply.send(updated);
  });
}
