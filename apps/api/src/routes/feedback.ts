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
}
