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

export async function feedbackRoutes(app: FastifyInstance) {
  // Submit feedback
  app.post("/feedback", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid request" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeWorkspaceId: true },
    });

    await prisma.feedback.create({
      data: {
        userId,
        workspaceId: user?.activeWorkspaceId ?? null,
        type: parsed.data.type,
        message: parsed.data.message,
        url: parsed.data.url ?? null,
      },
    });

    return reply.status(201).send({ ok: true });
  });

  // Get current user's own feedback (with admin replies)
  app.get("/feedback/mine", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const items = await prisma.feedback.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, message: true, url: true, createdAt: true, adminReply: true, repliedAt: true },
    });
    return reply.send(items);
  });

  // Admin: reply to feedback
  app.patch("/feedback/:id/reply", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const adminEmail = process.env.ADMIN_EMAIL ?? "";
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user || user.email !== adminEmail) return reply.status(403).send({ error: "Forbidden" });

    const { id } = req.params as { id: string };
    const { reply: adminReply } = req.body as { reply: string };
    if (!adminReply?.trim()) return reply.status(400).send({ error: "Reply required" });

    const updated = await prisma.feedback.update({
      where: { id },
      data: { adminReply: adminReply.trim(), repliedAt: new Date() },
    });
    return reply.send(updated);
  });
}
