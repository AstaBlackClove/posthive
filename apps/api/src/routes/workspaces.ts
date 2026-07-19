import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { withAuth, getUser, getWorkspaceId } from "../lib/auth/withAuth.js";
import { sendWorkspaceInviteEmail } from "../lib/mailer.js";
import { enforcePlan } from "../lib/enforcePlan.js";

const createBody = z.object({
  name: z.string().min(1).max(80).trim(),
});

const updateBody = z.object({
  name: z.string().min(1).max(80).trim(),
});

const inviteBody = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

const changRoleBody = z.object({
  role: z.enum(["admin", "member"]),
});

export async function workspaceRoutes(app: FastifyInstance): Promise<void> {

  // GET /workspaces — list all workspaces the user is a member of
  app.get("/workspaces", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      orderBy: { joinedAt: "asc" },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            plan: true,
            planStatus: true,
            trialEndsAt: true,
            createdAt: true,
            _count: { select: { members: true } },
          },
        },
      },
    });

    const activeWorkspaceId = (await prisma.user.findUnique({
      where: { id: userId },
      select: { activeWorkspaceId: true },
    }))?.activeWorkspaceId;

    return reply.send({
      workspaces: memberships.map(m => ({
        id: m.workspace.id,
        name: m.workspace.name,
        plan: m.workspace.plan,
        planStatus: m.workspace.planStatus,
        trialEndsAt: m.workspace.trialEndsAt,
        memberCount: m.workspace._count.members,
        role: m.role,
        joinedAt: m.joinedAt,
        isActive: m.workspace.id === activeWorkspaceId,
        createdAt: m.workspace.createdAt,
      })),
    });
  });

  // POST /workspaces — create a new workspace with a 14-day trial
  app.post("/workspaces", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const workspace = await prisma.workspace.create({
      data: {
        name: parsed.data.name,
        plan: "trialing",
        planStatus: "trialing",
        trialEndsAt,
        allowTrial: true,
        members: { create: { userId, role: "owner" } },
      },
      select: { id: true, name: true, plan: true, planStatus: true, createdAt: true },
    });

    await prisma.user.update({ where: { id: userId }, data: { activeWorkspaceId: workspace.id } });

    return reply.status(201).send({ workspace });
  });

  // PATCH /workspaces/switch/:id — change the user's active workspace
  app.patch("/workspaces/switch/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { id } = req.params as { id: string };

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!membership) return reply.status(404).send({ error: "Workspace not found or not a member" });

    await prisma.user.update({ where: { id: userId }, data: { activeWorkspaceId: id } });

    return reply.send({ ok: true, activeWorkspaceId: id });
  });

  // PATCH /workspaces/:id — rename workspace (owner/admin only)
  app.patch("/workspaces/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { id } = req.params as { id: string };
    const parsed = updateBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!membership) return reply.status(404).send({ error: "Workspace not found" });
    if (!["owner", "admin"].includes(membership.role)) {
      return reply.status(403).send({ error: "Only owners and admins can rename the workspace" });
    }

    const workspace = await prisma.workspace.update({
      where: { id },
      data: { name: parsed.data.name },
      select: { id: true, name: true },
    });

    return reply.send({ workspace });
  });

  // DELETE /workspaces/:id/leave — leave a workspace (non-owners only)
  app.delete("/workspaces/:id/leave", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { id } = req.params as { id: string };

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!membership) return reply.status(404).send({ error: "Workspace not found" });
    if (membership.role === "owner") return reply.status(400).send({ error: "Owners cannot leave — delete the workspace or transfer ownership first" });

    await prisma.workspaceMember.delete({ where: { workspaceId_userId: { workspaceId: id, userId } } });

    // Switch active workspace to oldest remaining one
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { activeWorkspaceId: true } });
    if (user?.activeWorkspaceId === id) {
      const next = await prisma.workspaceMember.findFirst({
        where: { userId },
        orderBy: { joinedAt: "asc" },
        select: { workspaceId: true },
      });
      if (next) {
        await prisma.user.update({ where: { id: userId }, data: { activeWorkspaceId: next.workspaceId } });
      }
    }

    return reply.status(204).send();
  });

  // DELETE /workspaces/:id — delete workspace (owner only, cannot delete last workspace)
  app.delete("/workspaces/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { id } = req.params as { id: string };

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!membership || membership.role !== "owner") {
      return reply.status(403).send({ error: "Only the workspace owner can delete it" });
    }

    // Prevent deleting last workspace
    const membershipCount = await prisma.workspaceMember.count({ where: { userId } });
    if (membershipCount <= 1) {
      return reply.status(400).send({ error: "Cannot delete your only workspace" });
    }

    // Before cascade delete, find all members who have this as their active workspace
    const affectedUsers = await prisma.user.findMany({
      where: { activeWorkspaceId: id },
      select: { id: true },
    });

    // Cascade handled by schema (accounts, jobs, templates, members)
    await prisma.workspace.delete({ where: { id } });

    // Reset activeWorkspaceId for all affected members (including owner)
    await Promise.all(affectedUsers.map(async (u) => {
      const next = await prisma.workspaceMember.findFirst({
        where: { userId: u.id },
        orderBy: { joinedAt: "asc" },
        select: { workspaceId: true },
      });
      if (next) {
        await prisma.user.update({ where: { id: u.id }, data: { activeWorkspaceId: next.workspaceId } });
      }
    }));

    return reply.status(204).send();
  });

  // ─── Members ──────────────────────────────────────────────────────────────

  // GET /workspaces/:id/members — list members (owner/admin)
  app.get("/workspaces/:id/members", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { id } = req.params as { id: string };

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!membership) return reply.status(404).send({ error: "Workspace not found" });
    if (!["owner", "admin"].includes(membership.role)) {
      return reply.status(403).send({ error: "Only owners and admins can view members" });
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: id },
      orderBy: { joinedAt: "asc" },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    return reply.send({
      members: members.map(m => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        joinedAt: m.joinedAt,
        isCurrentUser: m.userId === userId,
      })),
    });
  });

  // PATCH /workspaces/:id/members/:memberId — change role (owner only)
  app.patch("/workspaces/:id/members/:memberId", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { id, memberId } = req.params as { id: string; memberId: string };
    const parsed = changRoleBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const requester = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!requester || requester.role !== "owner") {
      return reply.status(403).send({ error: "Only the owner can change roles" });
    }

    const target = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId: id },
    });
    if (!target) return reply.status(404).send({ error: "Member not found" });
    if (target.role === "owner") return reply.status(400).send({ error: "Cannot change owner role" });

    await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role: parsed.data.role },
    });

    return reply.send({ ok: true });
  });

  // DELETE /workspaces/:id/members/:memberId — remove member (owner/admin, cannot remove owner)
  app.delete("/workspaces/:id/members/:memberId", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { id, memberId } = req.params as { id: string; memberId: string };

    const requester = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!requester || !["owner", "admin"].includes(requester.role)) {
      return reply.status(403).send({ error: "Only owners and admins can remove members" });
    }

    const target = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId: id },
    });
    if (!target) return reply.status(404).send({ error: "Member not found" });
    if (target.role === "owner") return reply.status(400).send({ error: "Cannot remove the owner" });
    if (target.userId === userId) return reply.status(400).send({ error: "Cannot remove yourself" });

    await prisma.workspaceMember.delete({ where: { id: memberId } });

    return reply.status(204).send();
  });

  // ─── Invites ──────────────────────────────────────────────────────────────

  // POST /workspaces/:id/invite — send an invite (owner/admin)
  app.post("/workspaces/:id/invite", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId, name: inviterName } = getUser(req);
    const { id } = req.params as { id: string };
    const parsed = inviteBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const requester = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!requester || !["owner", "admin"].includes(requester.role)) {
      return reply.status(403).send({ error: "Only owners and admins can invite members" });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!workspace) return reply.status(404).send({ error: "Workspace not found" });

    // Plan gate — seats
    const seatBlocked = await enforcePlan(userId, id, "seats");
    if (seatBlocked) return reply.status(402).send(seatBlocked);

    // Check invitee is not already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (existingUser) {
      const alreadyMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: id, userId: existingUser.id } },
      });
      if (alreadyMember) return reply.status(409).send({ error: "User is already a member" });
    }

    // Expire any existing pending invite for this email+workspace
    await prisma.workspaceInvite.updateMany({
      where: { workspaceId: id, email: parsed.data.email, acceptedAt: null },
      data: { expiresAt: new Date(0) },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await prisma.workspaceInvite.create({
      data: {
        workspaceId: id,
        email: parsed.data.email,
        role: parsed.data.role,
        token,
        expiresAt,
      },
      select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
    });

    const acceptUrl = `${process.env.WEB_URL}/invite?token=${token}`;
    await sendWorkspaceInviteEmail(parsed.data.email, inviterName, workspace.name, parsed.data.role, acceptUrl);

    return reply.status(201).send({ invite });
  });

  // GET /workspaces/:id/invites — list pending invites (owner/admin)
  app.get("/workspaces/:id/invites", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { id } = req.params as { id: string };

    const requester = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!requester || !["owner", "admin"].includes(requester.role)) {
      return reply.status(403).send({ error: "Only owners and admins can view invites" });
    }

    const invites = await prisma.workspaceInvite.findMany({
      where: { workspaceId: id, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
    });

    return reply.send({ invites });
  });

  // DELETE /workspaces/:id/invites/:inviteId — cancel a pending invite
  app.delete("/workspaces/:id/invites/:inviteId", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { id, inviteId } = req.params as { id: string; inviteId: string };

    const requester = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!requester || !["owner", "admin"].includes(requester.role)) {
      return reply.status(403).send({ error: "Only owners and admins can cancel invites" });
    }

    const invite = await prisma.workspaceInvite.findFirst({
      where: { id: inviteId, workspaceId: id },
    });
    if (!invite) return reply.status(404).send({ error: "Invite not found" });

    await prisma.workspaceInvite.delete({ where: { id: inviteId } });

    return reply.status(204).send();
  });

  // ─── Public invite accept (no workspace auth context needed) ──────────────

  // GET /invites/:token — fetch invite info (public, no auth)
  app.get("/invites/:token", async (req, reply) => {
    const { token } = req.params as { token: string };

    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: { workspace: { select: { name: true } } },
    });

    if (!invite) return reply.status(404).send({ error: "Invite not found" });
    if (invite.acceptedAt) return reply.status(410).send({ error: "Invite already accepted" });
    if (invite.expiresAt < new Date()) return reply.status(410).send({ error: "Invite has expired" });

    return reply.send({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        workspaceName: invite.workspace.name,
        expiresAt: invite.expiresAt,
      },
    });
  });

  // POST /invites/:token/accept — accept an invite (requires auth)
  app.post("/invites/:token/accept", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { token } = req.params as { token: string };

    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: { workspace: { select: { id: true, name: true } } },
    });

    if (!invite) return reply.status(404).send({ error: "Invite not found" });
    if (invite.acceptedAt) return reply.status(410).send({ error: "Invite already accepted" });
    if (invite.expiresAt < new Date()) return reply.status(410).send({ error: "Invite has expired" });

    // Check user email matches invite email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user?.email.toLowerCase() !== invite.email.toLowerCase()) {
      return reply.status(403).send({ error: "This invite was sent to a different email address" });
    }

    // Check not already a member
    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
    });
    if (existing) return reply.status(409).send({ error: "You are already a member of this workspace" });

    // Plan gate — verify workspace still has a free seat
    const seatBlocked = await enforcePlan(userId, invite.workspaceId, "seats");
    if (seatBlocked) return reply.status(402).send(seatBlocked);

    await prisma.$transaction([
      prisma.workspaceMember.create({
        data: { workspaceId: invite.workspaceId, userId, role: invite.role },
      }),
      prisma.workspaceInvite.delete({
        where: { id: invite.id },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { activeWorkspaceId: invite.workspaceId },
      }),
    ]);

    return reply.send({ ok: true, workspaceId: invite.workspaceId, workspaceName: invite.workspace.name });
  });
}
