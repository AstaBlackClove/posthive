/**
 * Account management routes.
 *
 * POST /accounts/bluesky — connect a Bluesky account with handle + app-password
 * GET  /accounts          — list all connected accounts (credentials never returned)
 * DELETE /accounts/:id    — disconnect an account
 *
 * OAuth flows for Threads and LinkedIn will be added here once those
 * adapters are implemented.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { encryptBlueskyCredentials } from "../adapters/bluesky.js";
import { prisma } from "../lib/prisma.js";

const connectBlueskyBody = z.object({
  handle: z.string().min(1),
  appPassword: z.string().min(1),
});

export async function accountRoutes(app: FastifyInstance): Promise<void> {
  // Connect a Bluesky account
  app.post("/accounts/bluesky", async (req, reply) => {
    const parsed = connectBlueskyBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const { handle, appPassword } = parsed.data;

    let encryptedCredentials: string;
    try {
      // This validates the credentials against Bluesky before persisting.
      encryptedCredentials = await encryptBlueskyCredentials(handle, appPassword);
    } catch (err) {
      return reply.status(400).send({
        error: "Failed to authenticate with Bluesky — check your handle and app password",
        detail: String(err),
      });
    }

    // Fetch Bluesky avatar via public AppView API (no auth needed)
    let avatarUrl: string | null = null;
    try {
      const profileRes = await fetch(
        `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`
      );
      if (profileRes.ok) {
        const profile = await profileRes.json() as { avatar?: string };
        avatarUrl = profile.avatar ?? null;
      }
    } catch { /* avatar is optional — don't fail the whole connect */ }

    const account = await prisma.account.create({
      data: {
        platform: "bluesky",
        displayName: handle,
        credentials: encryptedCredentials,
        avatarUrl,
      },
      select: { id: true, platform: true, displayName: true, avatarUrl: true, createdAt: true },
    });

    return reply.status(201).send(account);
  });

  // List all accounts (no credentials in response)
  app.get("/accounts", async (_req, reply) => {
    const accounts = await prisma.account.findMany({
      select: { id: true, platform: true, displayName: true, avatarUrl: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return reply.send(accounts);
  });

  // Delete an account — remove linked targets first to satisfy foreign key
  app.delete("/accounts/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.postJobTarget.deleteMany({ where: { accountId: id } });
    await prisma.account.delete({ where: { id } });
    return reply.status(204).send();
  });
}
