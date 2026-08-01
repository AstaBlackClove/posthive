import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { withAuth } from "../lib/auth/withAuth.js";
import { getUser } from "../lib/auth/withAuth.js";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["bug", "feature", "general"]),
  message: z.string().min(1).max(5000),
  url: z.string().max(500).optional(),
});

function isAdmin(email: string) {
  return email === (process.env.ADMIN_EMAIL ?? "");
}

const withReplies = {
  replies: { orderBy: { createdAt: "asc" as const } },
} as const;

export async function feedbackRoutes(app: FastifyInstance) {
  // Submit new feedback (opens thread with first message)
  app.post("/feedback", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid request" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeWorkspaceId: true },
    });

    const feedback = await prisma.feedback.create({
      data: {
        userId,
        workspaceId: user?.activeWorkspaceId ?? null,
        type: parsed.data.type,
        message: parsed.data.message,
        url: parsed.data.url ?? null,
        replies: { create: { sender: "user", message: parsed.data.message } },
      },
      include: withReplies,
    });

    return reply.status(201).send(feedback);
  });

  // Get current user's own feedback threads
  app.get("/feedback/mine", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const items = await prisma.feedback.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, type: true, message: true, url: true,
        createdAt: true, unreadByUser: true,
        replies: { orderBy: { createdAt: "asc" } },
      },
    });
    return reply.send(items);
  });

  // Get unread count for current user
  app.get("/feedback/unread", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const result = await prisma.feedback.aggregate({
      where: { userId },
      _sum: { unreadByUser: true },
    });
    return reply.send({ unread: result._sum.unreadByUser ?? 0 });
  });

  // Mark feedback thread as read by user
  app.post("/feedback/:id/read", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { id } = req.params as { id: string };
    await prisma.feedback.updateMany({
      where: { id, userId },
      data: { unreadByUser: 0 },
    });
    return reply.send({ ok: true });
  });

  // Add reply to thread (user or admin)
  app.post("/feedback/:id/replies", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { id } = req.params as { id: string };
    const { message } = req.body as { message: string };
    if (!message?.trim()) return reply.status(400).send({ error: "Message required" });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return reply.status(401).send({ error: "Unauthorized" });

    const sender = isAdmin(user.email) ? "admin" : "user";

    // Verify user owns this feedback (unless admin)
    if (sender === "user") {
      const fb = await prisma.feedback.findUnique({ where: { id }, select: { userId: true } });
      if (!fb || fb.userId !== userId) return reply.status(403).send({ error: "Forbidden" });
    }

    const [replyItem] = await prisma.$transaction([
      prisma.feedbackReply.create({
        data: { feedbackId: id, sender, message: message.trim() },
      }),
      // If admin replies, increment unread count for user
      ...(sender === "admin"
        ? [prisma.feedback.update({ where: { id }, data: { unreadByUser: { increment: 1 } } })]
        : []),
    ]);

    return reply.status(201).send(replyItem);
  });

  // Admin: get all feedback threads
  app.get("/feedback/all", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user || !isAdmin(user.email)) return reply.status(403).send({ error: "Forbidden" });

    const items = await prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        ...withReplies,
        user: { select: { name: true, email: true } },
      },
    });
    return reply.send(items);
  });
}
