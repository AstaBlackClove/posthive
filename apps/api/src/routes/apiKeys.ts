import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { withAuth, getUser } from "../lib/auth/withAuth.js";
import { generateApiKey, canUseApi, maxApiKeys } from "../lib/auth/withApiKey.js";

export async function apiKeyRoutes(app: FastifyInstance): Promise<void> {

  // List all active API keys for the current user
  app.get("/user/api-keys", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const keys = await prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ keys });
  });

  // Create a new API key — returns the plaintext key ONCE
  app.post("/user/api-keys", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true, planStatus: true } });
    const { plan, planStatus } = dbUser ?? { plan: "trialing", planStatus: "trialing" };

    if (!canUseApi(plan, planStatus)) {
      return reply.status(403).send({
        error: "API access requires a Pro or Team plan.",
        upgrade: true,
      });
    }

    const { name } = req.body as { name?: string };
    if (!name?.trim()) return reply.status(400).send({ error: "Key name is required" });

    const limit = maxApiKeys(plan);
    const { raw, hash, prefix } = generateApiKey();

    try {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.apiKey.count({ where: { userId, revokedAt: null } });
        if (existing >= limit) {
          throw Object.assign(new Error(`Your plan allows a maximum of ${limit} API keys.`), { code: "LIMIT" });
        }
        await tx.apiKey.create({ data: { userId, name: name.trim(), keyHash: hash, prefix } });
      });
    } catch (err) {
      if ((err as { code?: string }).code === "LIMIT") {
        return reply.status(403).send({ error: (err as Error).message });
      }
      throw err;
    }

    // Return the raw key only once — we never store it
    return reply.status(201).send({ key: raw, prefix, name: name.trim() });
  });

  // Revoke an API key
  app.delete("/user/api-keys/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { id } = req.params as { id: string };

    const key = await prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.userId !== userId) {
      return reply.status(404).send({ error: "API key not found" });
    }
    if (key.revokedAt) {
      return reply.status(400).send({ error: "Key already revoked" });
    }

    await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
    return reply.send({ ok: true });
  });
}
