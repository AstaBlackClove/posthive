import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { schedulePostJob, postJobQueue } from "../lib/queue.js";
import { withAuth, getUser } from "../lib/auth/withAuth.js";
import { authProvider } from "../lib/auth/index.js";

const TARGET_SELECT = {
  id: true, accountId: true, status: true,
  platformPostId: true, error: true, attempts: true,
  account: { select: { platform: true, displayName: true } },
};

const createJobBody = z.object({
  scheduledFor: z.string().datetime(),
  content: z.object({ text: z.string().min(1), mediaUrls: z.array(z.string()).default([]) }),
  commentText: z.string().optional(),
  accountIds: z.array(z.string().cuid()).min(1),
  dryRun: z.boolean().default(false),
});

export async function jobRoutes(app: FastifyInstance): Promise<void> {

  // Create a new scheduled job
  app.post("/jobs", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const parsed = createJobBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { scheduledFor, content, commentText, accountIds, dryRun } = parsed.data;

    // Verify accounts belong to this user
    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds }, userId },
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
        userId,
        targets: { create: accountIds.map((accountId) => ({ accountId })) },
      },
      include: { targets: { select: TARGET_SELECT } },
    });

    await schedulePostJob(job.id, new Date(scheduledFor));
    return reply.status(201).send(job);
  });

  // SSE stream — scoped to current user.
  // EventSource can't send cookies cross-origin so auth token comes via ?token= query param.
  app.get("/jobs/stream", async (req, reply) => {
    const origin = req.headers.origin ?? process.env.WEB_URL ?? "http://localhost:3000";
    const sseHeaders: Record<string, string> = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
    };

    const token = (req.query as Record<string, string>)?.token;
    const user = token ? await authProvider.validateAccessToken(token) : null;

    if (!user) {
      reply.raw.writeHead(401, sseHeaders);
      reply.raw.write(`data: ${JSON.stringify({ error: "unauthorized" })}\n\n`);
      reply.raw.end();
      return;
    }

    const { id: userId } = user;

    reply.raw.writeHead(200, sseHeaders);

    const fetchJobs = async () => {
      const jobs = await prisma.postJob.findMany({
        where: { userId },
        orderBy: { scheduledFor: "desc" },
        include: { targets: { select: TARGET_SELECT } },
      });
      return JSON.stringify(jobs);
    };

    let lastPayload = "";
    try {
      lastPayload = await fetchJobs();
      reply.raw.write(`data: ${lastPayload}\n\n`);
    } catch { /* ignore */ }

    const poll = setInterval(async () => {
      try {
        const payload = await fetchJobs();
        if (payload !== lastPayload) { lastPayload = payload; reply.raw.write(`data: ${payload}\n\n`); }
      } catch { /* ignore */ }
    }, 3000);

    const keepAlive = setInterval(() => { reply.raw.write(": ping\n\n"); }, 25000);

    req.raw.on("close", () => { clearInterval(poll); clearInterval(keepAlive); });
    await new Promise<void>((resolve) => req.raw.on("close", resolve));
  });

  // List jobs for current user
  app.get("/jobs", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const jobs = await prisma.postJob.findMany({
      where: { userId },
      orderBy: { scheduledFor: "desc" },
      include: { targets: { select: TARGET_SELECT } },
    });
    return reply.send(jobs);
  });

  // Single job detail — scoped to user
  app.get("/jobs/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { id } = req.params as { id: string };
    const job = await prisma.postJob.findFirst({
      where: { id, userId },
      include: { targets: { select: TARGET_SELECT } },
    });
    if (!job) return reply.status(404).send({ error: "Job not found" });
    return reply.send(job);
  });

  // Reschedule a pending job
  app.patch("/jobs/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { id } = req.params as { id: string };
    const body = z.object({ scheduledFor: z.string().datetime() }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const job = await prisma.postJob.findFirst({ where: { id, userId }, select: { status: true } });
    if (!job) return reply.status(404).send({ error: "Job not found" });
    if (job.status !== "pending") {
      return reply.status(409).send({ error: `Cannot reschedule a job with status "${job.status}"` });
    }

    const newScheduledFor = new Date(body.data.scheduledFor);
    const updated = await prisma.postJob.update({ where: { id }, data: { scheduledFor: newScheduledFor } });
    await postJobQueue.remove(id);
    await schedulePostJob(id, newScheduledFor);
    return reply.send(updated);
  });
}
