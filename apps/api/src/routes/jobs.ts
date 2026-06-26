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

const createJobBody = z.object({
  scheduledFor: z.string().datetime(), // ISO 8601
  content: z.object({
    text: z.string().min(1),
    mediaUrls: z.array(z.string()).default([]),
  }),
  commentText: z.string().optional(),
  // Which accounts to target — must already exist in the accounts table
  accountIds: z.array(z.string().cuid()).min(1),
});

export async function jobRoutes(app: FastifyInstance): Promise<void> {
  // Create a new scheduled job
  app.post("/jobs", async (req, reply) => {
    const parsed = createJobBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const { scheduledFor, content, commentText, accountIds } = parsed.data;

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
        targets: {
          create: accountIds.map((accountId) => ({ accountId })),
        },
      },
      include: {
        targets: { select: { id: true, accountId: true, status: true } },
      },
    });

    return reply.status(201).send(job);
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

    const updated = await prisma.postJob.update({
      where: { id },
      data: { scheduledFor: new Date(body.data.scheduledFor) },
    });

    return reply.send(updated);
  });
}
