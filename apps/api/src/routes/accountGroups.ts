import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { withAuth } from "../lib/auth/withAuth.js";

export async function accountGroupRoutes(app: FastifyInstance) {
  // GET /account-groups — list groups for current workspace
  app.get("/account-groups", { preHandler: [withAuth] }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { activeWorkspaceId: true } });
    if (!user?.activeWorkspaceId) return reply.status(400).send({ error: "No active workspace" });

    const groups = await prisma.accountGroup.findMany({
      where: { workspaceId: user.activeWorkspaceId },
      include: { members: { select: { accountId: true } } },
      orderBy: { createdAt: "asc" },
    });

    return groups.map((g) => ({ id: g.id, name: g.name, accountIds: g.members.map((m: { accountId: string }) => m.accountId) }));
  });

  // POST /account-groups — create group
  app.post("/account-groups", { preHandler: [withAuth] }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { activeWorkspaceId: true } });
    if (!user?.activeWorkspaceId) return reply.status(400).send({ error: "No active workspace" });

    const { name, accountIds = [] } = req.body as { name: string; accountIds?: string[] };
    if (!name?.trim()) return reply.status(400).send({ error: "name required" });

    // Verify all accountIds belong to this workspace
    if (accountIds.length) {
      const valid = await prisma.account.count({
        where: { id: { in: accountIds }, workspaceId: user.activeWorkspaceId },
      });
      if (valid !== accountIds.length) return reply.status(400).send({ error: "Invalid account IDs" });
    }

    const group = await prisma.accountGroup.create({
      data: {
        name: name.trim(),
        workspaceId: user.activeWorkspaceId,
        members: { create: accountIds.map((id) => ({ accountId: id })) },
      },
      include: { members: { select: { accountId: true } } },
    });

    return reply.status(201).send({ id: group.id, name: group.name, accountIds: group.members.map((m: { accountId: string }) => m.accountId) });
  });

  // PATCH /account-groups/:id — rename + update members
  app.patch("/account-groups/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const { id } = req.params as { id: string };
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { activeWorkspaceId: true } });
    if (!user?.activeWorkspaceId) return reply.status(400).send({ error: "No active workspace" });

    const group = await prisma.accountGroup.findFirst({ where: { id, workspaceId: user.activeWorkspaceId } });
    if (!group) return reply.status(404).send({ error: "Not found" });

    const { name, accountIds } = req.body as { name?: string; accountIds?: string[] };

    if (accountIds !== undefined) {
      if (accountIds.length) {
        const valid = await prisma.account.count({
          where: { id: { in: accountIds }, workspaceId: user.activeWorkspaceId },
        });
        if (valid !== accountIds.length) return reply.status(400).send({ error: "Invalid account IDs" });
      }
      // Replace members atomically
      await prisma.$transaction([
        prisma.accountGroupMember.deleteMany({ where: { groupId: id } }),
        ...(accountIds.length
          ? [prisma.accountGroupMember.createMany({ data: accountIds.map((aid) => ({ groupId: id, accountId: aid })) })]
          : []),
      ]);
    }

    const updated = await prisma.accountGroup.update({
      where: { id },
      data: { ...(name?.trim() ? { name: name.trim() } : {}) },
      include: { members: { select: { accountId: true } } },
    });

    return { id: updated.id, name: updated.name, accountIds: updated.members.map((m: { accountId: string }) => m.accountId) };
  });

  // DELETE /account-groups/:id
  app.delete("/account-groups/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const { id } = req.params as { id: string };
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { activeWorkspaceId: true } });
    if (!user?.activeWorkspaceId) return reply.status(400).send({ error: "No active workspace" });

    const group = await prisma.accountGroup.findFirst({ where: { id, workspaceId: user.activeWorkspaceId } });
    if (!group) return reply.status(404).send({ error: "Not found" });

    await prisma.accountGroup.delete({ where: { id } });
    return reply.status(204).send();
  });
}
