import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { encryptBlueskyCredentials } from "../adapters/bluesky.js";
import { prisma } from "../lib/prisma.js";
import { withAuth, getUser } from "../lib/auth/withAuth.js";
import { getPlan } from "../lib/plans.js";
import { enforcePlan } from "../lib/enforcePlan.js";

const connectBlueskyBody = z.object({
  handle: z.string().min(1),
  appPassword: z.string().min(1),
});

export async function accountRoutes(app: FastifyInstance): Promise<void> {

  // Connect a Bluesky account
  app.post("/accounts/bluesky", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const blocked = await enforcePlan(userId, "accounts");
    if (blocked) return reply.status(402).send(blocked);
    const parsed = connectBlueskyBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { handle, appPassword } = parsed.data;

    let encryptedCredentials: string;
    try {
      encryptedCredentials = await encryptBlueskyCredentials(handle, appPassword);
    } catch (err) {
      return reply.status(400).send({
        error: "Failed to authenticate with Bluesky — check your handle and app password",
        detail: String(err),
      });
    }

    let avatarUrl: string | null = null;
    try {
      const profileRes = await fetch(
        `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`
      );
      if (profileRes.ok) {
        const profile = await profileRes.json() as { avatar?: string };
        avatarUrl = profile.avatar ?? null;
      }
    } catch { /* avatar optional */ }

    const account = await prisma.account.create({
      data: { platform: "bluesky", displayName: handle, credentials: encryptedCredentials, avatarUrl, userId },
      select: { id: true, platform: true, displayName: true, avatarUrl: true, createdAt: true },
    });

    return reply.status(201).send(account);
  });

  // List accounts for current user
  app.get("/accounts", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const accounts = await prisma.account.findMany({
      where: { userId },
      select: { id: true, platform: true, displayName: true, avatarUrl: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return reply.send(accounts);
  });

  // Delete account — scoped to user
  app.delete("/accounts/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { id } = req.params as { id: string };
    const account = await prisma.account.findFirst({ where: { id, userId } });
    if (!account) return reply.status(404).send({ error: "Account not found" });
    await prisma.postJobTarget.deleteMany({ where: { accountId: id } });
    await prisma.account.delete({ where: { id } });
    return reply.status(204).send();
  });
}
