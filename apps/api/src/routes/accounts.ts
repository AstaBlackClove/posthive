import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { encryptBlueskyCredentials } from "../adapters/bluesky.js";
import { decodeNsec, generateNostrKeypair, fetchNostrProfile } from "../adapters/nostr.js";
import { nip19 } from "nostr-tools";
import { decrypt, encrypt } from "../lib/encryption.js";
import { prisma } from "../lib/prisma.js";
import { withAuth, getUser, getWorkspaceId, requireAdminRole } from "../lib/auth/withAuth.js";
import { enforcePlan } from "../lib/enforcePlan.js";
import type { StorageAdapter } from "../lib/storage.js";

const connectBlueskyBody = z.object({
  handle: z.string().min(1),
  appPassword: z.string().regex(
    /^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i,
    "Must be a valid Bluesky app password (xxxx-xxxx-xxxx-xxxx)"
  ),
});

export async function accountRoutes(app: FastifyInstance, opts: { storage: StorageAdapter }): Promise<void> {
  const { storage } = opts;

  // Connect a Bluesky account
  app.post("/accounts/bluesky", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);
    const roleBlocked = await requireAdminRole(userId, workspaceId);
    if (roleBlocked) return reply.status(403).send(roleBlocked);
    const parsed = connectBlueskyBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { handle, appPassword } = parsed.data;

    let encryptedCredentials: string;
    try {
      encryptedCredentials = await encryptBlueskyCredentials(handle, appPassword);
    } catch {
      // Don't log err — it may contain the submitted app password
      return reply.status(400).send({
        error: "Failed to authenticate with Bluesky — check your handle and app password",
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

    // Prevent duplicates — update credentials if account already exists
    const existing = await prisma.account.findFirst({
      where: { workspaceId, platform: "bluesky", displayName: handle },
    });
    if (existing) {
      const updated = await prisma.account.update({
        where: { id: existing.id },
        data: { credentials: encryptedCredentials, avatarUrl },
        select: { id: true, platform: true, displayName: true, avatarUrl: true, createdAt: true },
      });
      return reply.status(200).send(updated);
    }

    const blocked = await enforcePlan(userId, workspaceId, "accounts");
    if (blocked) return reply.status(402).send(blocked);

    const account = await prisma.account.create({
      data: { platform: "bluesky", displayName: handle, credentials: encryptedCredentials, avatarUrl, userId, workspaceId },
      select: { id: true, platform: true, displayName: true, avatarUrl: true, createdAt: true },
    });

    return reply.status(201).send(account);
  });

  // Generate a fresh Nostr keypair (no credentials needed — returns nsec/npub bech32)
  app.post("/accounts/nostr/generate", { preHandler: [withAuth] }, async (_req, reply) => {
    const keypair = generateNostrKeypair();
    return reply.send({ nsecBech32: keypair.nsecBech32, npubBech32: keypair.npubBech32 });
  });

  // Connect a Nostr account via nsec (bech32 or raw hex)
  app.post("/accounts/nostr", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);
    const roleBlocked = await requireAdminRole(userId, workspaceId);
    if (roleBlocked) return reply.status(403).send(roleBlocked);
    const { nsec } = req.body as { nsec?: string };
    if (!nsec?.trim()) return reply.status(400).send({ error: "nsec is required" });

    let nsecHex: string;
    let npubHex: string;
    let npubBech32: string;
    try {
      ({ nsecHex, npubHex, npubBech32 } = decodeNsec(nsec.trim()));
    } catch {
      return reply.status(400).send({ error: "Invalid nsec — must be a bech32 nsec1... or 64-char hex key" });
    }

    const credentials = encrypt(JSON.stringify({ nsec: nsecHex, npub: npubHex }));

    // Fetch profile metadata from relays (best-effort)
    let avatarUrl: string | null = null;
    let displayName = npubBech32;
    try {
      const profile = await fetchNostrProfile(npubHex);
      if (profile.name) displayName = profile.name;
      avatarUrl = profile.picture;
    } catch { /* optional */ }

    // Dedup by npub (not displayName, which may change)
    const nostrAccounts = await prisma.account.findMany({ where: { workspaceId, platform: "nostr" } });
    const existing = nostrAccounts.find(a => {
      try { return (JSON.parse(decrypt(a.credentials)) as { npub: string }).npub === npubHex; } catch { return false; }
    });
    if (existing) {
      const updated = await prisma.account.update({
        where: { id: existing.id },
        data: { credentials, avatarUrl, displayName },
        select: { id: true, platform: true, displayName: true, avatarUrl: true, createdAt: true },
      });
      return reply.status(200).send(updated);
    }

    const blocked = await enforcePlan(userId, workspaceId, "accounts");
    if (blocked) return reply.status(402).send(blocked);

    const account = await prisma.account.create({
      data: { platform: "nostr", displayName, credentials, avatarUrl, userId, workspaceId },
      select: { id: true, platform: true, displayName: true, avatarUrl: true, createdAt: true },
    });
    return reply.status(201).send(account);
  });

  // Refresh Nostr avatar from relays without reconnecting
  app.post("/accounts/nostr/:id/refresh-avatar", { preHandler: [withAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const workspaceId = getWorkspaceId(req);

    const account = await prisma.account.findFirst({ where: { id, workspaceId, platform: "nostr" } });
    if (!account) return reply.status(404).send({ error: "Account not found" });

    const { npub: npubHex } = JSON.parse(decrypt(account.credentials)) as { nsec: string; npub: string };
    let avatarUrl: string | null = null;
    let displayName: string | undefined;
    try {
      const profile = await fetchNostrProfile(npubHex);
      avatarUrl = profile.picture;
      if (profile.name) displayName = profile.name;
    } catch { /* optional */ }

    const updated = await prisma.account.update({
      where: { id },
      data: { avatarUrl, ...(displayName ? { displayName } : {}) },
      select: { id: true, platform: true, displayName: true, avatarUrl: true, createdAt: true },
    });
    return reply.send(updated);
  });

  // List accounts for current workspace
  app.get("/accounts", { preHandler: [withAuth] }, async (req, reply) => {
    const workspaceId = getWorkspaceId(req);
    const accounts = await prisma.account.findMany({
      where: { workspaceId },
      select: { id: true, platform: true, displayName: true, avatarUrl: true, createdAt: true, expiresAt: true, credentials: true },
      orderBy: { createdAt: "asc" },
    });
    // Expose npub for Nostr accounts (public key — not sensitive), strip credentials from response
    return reply.send(accounts.map(({ credentials, ...a }) => {
      if (a.platform === "nostr") {
        try {
          const { npub } = JSON.parse(decrypt(credentials)) as { npub: string };
          return { ...a, npub: nip19.npubEncode(npub) };
        } catch { /* fall through */ }
      }
      return a;
    }));
  });

  // Instagram location search — proxies Facebook Places API using user's IG token
  app.get("/accounts/instagram/locations", { preHandler: [withAuth] }, async (req, reply) => {
    const workspaceId = getWorkspaceId(req);
    const { q } = req.query as { q?: string };
    if (!q || q.trim().length < 2) return reply.send([]);

    const igAccount = await prisma.account.findFirst({
      where: { workspaceId, platform: "instagram" },
    });
    if (!igAccount) return reply.status(400).send({ error: "No Instagram account connected" });

    const { accessToken } = JSON.parse(decrypt(igAccount.credentials)) as { accessToken: string; userId: string };

    const url = new URL("https://graph.facebook.com/v21.0/search");
    url.searchParams.set("type", "place");
    url.searchParams.set("q", q);
    url.searchParams.set("fields", "id,name,location");
    url.searchParams.set("access_token", accessToken);

    const res = await fetch(url.toString());
    if (!res.ok) return reply.send([]);
    const data = await res.json() as { data?: { id: string; name: string; location?: { city?: string; country?: string } }[] };

    return reply.send(
      (data.data ?? []).map(p => ({
        id: p.id,
        name: p.name,
        subtitle: [p.location?.city, p.location?.country].filter(Boolean).join(", "),
      }))
    );
  });

  // Posts published per account this month
  app.get("/accounts/stats", { preHandler: [withAuth] }, async (req, reply) => {
    const workspaceId = getWorkspaceId(req);
    const start = new Date();
    start.setDate(1); start.setHours(0, 0, 0, 0);

    const rows = await prisma.postJobTarget.groupBy({
      by: ["accountId"],
      where: {
        account: { workspaceId },
        status: { in: ["post_done", "comment_done"] },
        postJob: { scheduledFor: { gte: start } },
      },
      _count: { accountId: true },
    });

    const stats: Record<string, number> = {};
    for (const r of rows) stats[r.accountId] = r._count.accountId;
    return reply.send(stats);
  });

  // Delete account — scoped to workspace
  app.delete("/accounts/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);
    const roleBlocked = await requireAdminRole(userId, workspaceId);
    if (roleBlocked) return reply.status(403).send(roleBlocked);
    const { id } = req.params as { id: string };
    const account = await prisma.account.findFirst({ where: { id, workspaceId } });
    if (!account) return reply.status(404).send({ error: "Account not found" });

    // Delete PostJobs whose only target is this account — they'd be unsendable orphans.
    // Jobs with multiple targets keep the job; only this account's target is removed below.
    const orphanJobs = await prisma.postJob.findMany({
      where: {
        workspaceId,
        targets: { every: { accountId: id } },
      },
      select: { id: true },
    });
    if (orphanJobs.length > 0) {
      await prisma.postJob.deleteMany({ where: { id: { in: orphanJobs.map(j => j.id) } } });
    }

    // Remove this account's targets from multi-account jobs, then delete the account.
    await prisma.postJobTarget.deleteMany({ where: { accountId: id } });
    await prisma.account.delete({ where: { id } });

    // Clean up stored avatar (e.g. Telegram channel photo we uploaded)
    if (account.avatarUrl && !account.avatarUrl.startsWith("http")) {
      try { await storage.delete(account.avatarUrl); } catch { /* already gone */ }
    }

    return reply.status(204).send();
  });
}
