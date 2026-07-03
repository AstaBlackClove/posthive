import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { withAuth, withAuthOrToken, getUser } from "../lib/auth/withAuth.js";

const templateBody = z.object({
  name: z.string().min(1).max(100),
  content: z.object({
    text: z.string().default(""),
    commentText: z.string().optional(),
    mediaUrls: z.array(z.string()).default([]),
    altTexts: z.array(z.string()).optional(),
    mediaType: z.enum(["post", "reel", "story"]).optional(),
    youtubeType: z.enum(["short", "video"]).optional(),
    youtubeTitle: z.string().optional(),
    youtubeDescription: z.string().optional(),
    perAccount: z.record(z.string(), z.object({
      text: z.string().optional(),
      commentText: z.string().optional(),
    })).optional(),
  }),
});

export async function templateRoutes(app: FastifyInstance): Promise<void> {

  // List all templates for the current user
  app.get("/templates", { preHandler: [withAuthOrToken] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const templates = await prisma.template.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, content: true, createdAt: true, updatedAt: true },
    });
    return reply.send({ templates });
  });

  // Create a new template
  app.post("/templates", { preHandler: [withAuthOrToken] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const parsed = templateBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const existing = await prisma.template.findFirst({
      where: { userId, name: { equals: parsed.data.name, mode: "insensitive" } },
    });
    if (existing) return reply.status(409).send({ error: `A template named "${parsed.data.name}" already exists.` });

    const template = await prisma.template.create({
      data: {
        userId,
        name: parsed.data.name,
        content: JSON.stringify(parsed.data.content),
      },
      select: { id: true, name: true, content: true, createdAt: true, updatedAt: true },
    });
    return reply.status(201).send({ template });
  });

  // Update template name
  app.patch("/templates/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { id } = req.params as { id: string };
    const { name } = req.body as { name?: string };
    if (!name) return reply.status(400).send({ error: "Name required" });

    const template = await prisma.template.findUnique({ where: { id } });
    if (!template || template.userId !== userId) return reply.status(404).send({ error: "Not found" });

    const updated = await prisma.template.update({
      where: { id },
      data: { name },
      select: { id: true, name: true, content: true, updatedAt: true },
    });
    return reply.send({ template: updated });
  });

  // Delete a template
  app.delete("/templates/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { id } = req.params as { id: string };

    const template = await prisma.template.findUnique({ where: { id } });
    if (!template || template.userId !== userId) return reply.status(404).send({ error: "Not found" });

    await prisma.template.delete({ where: { id } });
    return reply.send({ ok: true });
  });
}
