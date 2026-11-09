import type { FastifyRequest } from "fastify";
import type { Prisma } from "@prisma/client";
import { authProvider } from "./index.js";
import { prisma } from "../prisma.js";
import { createAuthGuard } from "./authGuard.js";
import type { AuthUser } from "./types.js";

export {
  COOKIE_OPTS,
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  setAuthCookies,
  clearAuthCookies,
  isPersistent,
} from "./authGuard.js";

async function resolveWorkspace(req: FastifyRequest, userId: string): Promise<void> {
  const wsHeader = req.headers["x-workspace-id"] as string | undefined;

  if (wsHeader) {
    // Validate the user is actually a member of the requested workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: wsHeader, userId } },
    });
    if (membership) {
      req.workspaceId = wsHeader;
      return;
    }
    // Header supplied but not a member — fall through to active workspace
  }

  // Resolve from DB: the active workspace, but only while the person is still a member of it
  // (removing a member does not reset their activeWorkspaceId), else the first membership
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      activeWorkspaceId: true,
      workspaceMembers: {
        orderBy: { joinedAt: "asc" },
        select: { workspaceId: true },
      },
    },
  });

  const memberOf = dbUser?.workspaceMembers ?? [];
  const active = dbUser?.activeWorkspaceId;
  req.workspaceId = (active && memberOf.some((m) => m.workspaceId === active) ? active : memberOf[0]?.workspaceId) ?? null;
}

const guard = createAuthGuard({ provider: authProvider, resolveWorkspace });

// Fastify preHandler — cookies only, no query param.
// Use this on all routes except SSE.
export const withAuth = guard.withAuth;

// For the SSE route only — also accepts ?token= query param because EventSource
// cannot send cookies cross-origin. Do not use on any other route.
export const withAuthOrToken = guard.withAuthOrToken;

// Type helpers — use in route handlers after withAuth preHandler
export function getUser(req: FastifyRequest): AuthUser {
  if (!req.user) throw new Error("No user on request — withAuth not applied");
  return req.user;
}

export function getWorkspaceId(req: FastifyRequest): string {
  if (!req.workspaceId) throw new Error("No workspaceId on request — withAuth not applied or user has no workspace");
  return req.workspaceId;
}

/** Returns the user's role in the workspace, or null if not a member. */
export async function getWorkspaceRole(userId: string, workspaceId: string): Promise<string | null> {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  return membership?.role ?? null;
}

/** Returns 403 payload if the user is not owner/admin, null if allowed. */
export async function requireAdminRole(userId: string, workspaceId: string): Promise<{ error: string; code: string } | null> {
  const role = await getWorkspaceRole(userId, workspaceId);
  if (!role || !["owner", "admin"].includes(role)) {
    return { error: "Only workspace admins can perform this action.", code: "FORBIDDEN" };
  }
  return null;
}

/** Returns 403 payload if the user is not the workspace owner, null if allowed. */
export async function requireOwnerRole(userId: string, workspaceId: string): Promise<{ error: string; code: string } | null> {
  const role = await getWorkspaceRole(userId, workspaceId);
  if (role !== "owner") {
    return { error: "Only the workspace owner can manage billing.", code: "FORBIDDEN" };
  }
  return null;
}

// Roles that manage the workspace and can bypass the design-approval gate:
// owner/admin = super admin (everything), designer = design team (review + templates).
export const MANAGE_ROLES = ["owner", "admin", "designer"] as const;

export function isManageRole(role: string | null | undefined): boolean {
  return role !== null && role !== undefined && (MANAGE_ROLES as readonly string[]).includes(role);
}

/** Returns 403 payload if the user is not owner/admin/designer, null if allowed. */
export async function requireManageRole(userId: string, workspaceId: string): Promise<{ error: string; code: string } | null> {
  const role = await getWorkspaceRole(userId, workspaceId);
  if (!isManageRole(role)) {
    return { error: "Only workspace admins or designers can perform this action.", code: "FORBIDDEN" };
  }
  return null;
}

// ── Content-role gates (docs/role-access-matrix.md) ──────────────────────────────

// Roles allowed to create/edit/delete content: Admin (owner/admin) + Marketing (member).
// Per spec, designer read-only: approve/reject only. Unknown/null roles are treated
// like designer — they may still see their OWN drafts (jobVisibilityWhere).
export function isContentEditorRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "member";
}

export const CONTENT_EDITOR_FORBIDDEN_MSG = "Content is created and edited by Admin and Marketing only.";
export const CONTENT_EDITOR_FORBIDDEN = { error: CONTENT_EDITOR_FORBIDDEN_MSG, code: "FORBIDDEN" } as const;

/** Returns 403 payload if the user may not create/edit content, null if allowed. */
export async function requireContentEditorRole(userId: string, workspaceId: string): Promise<{ error: string; code: string } | null> {
  const role = await getWorkspaceRole(userId, workspaceId);
  return isContentEditorRole(role) ? null : CONTENT_EDITOR_FORBIDDEN;
}

// Template library (US-07): only Tim Desain uploads, replaces and deletes templates.
// Admin and Marketing view and pick only.
export const TEMPLATE_MANAGER_FORBIDDEN = { error: "Templates are managed by the design team only.", code: "FORBIDDEN" } as const;

/** Returns 403 payload if the user may not manage templates, null if allowed. */
export async function requireTemplateManagerRole(userId: string, workspaceId: string): Promise<{ error: string; code: string } | null> {
  const role = await getWorkspaceRole(userId, workspaceId);
  return role === "designer" ? null : TEMPLATE_MANAGER_FORBIDDEN;
}

// ── Draft visibility ────────────────────────────────────────────────────────

// Only Marketing (member) sees other people's plain drafts. Owner/admin see their
// own drafts; everyone still sees content in review (approvalStatus "pending")
// plus scheduled/published/failed posts, so the approve/reject flow keeps working.
// Unknown roles (null membership) get the restricted filter — secure default.
export interface DraftVisibilityJob {
  status: string;
  approvalStatus?: string | null;
  userId: string;
}

export function isDraftVisibleTo(role: string | null | undefined, viewerId: string, job: DraftVisibilityJob): boolean {
  if (job.status !== "draft") return true;
  if (job.userId === viewerId) return true;               // own drafts are always visible
  if (job.approvalStatus === "pending") return true;      // in review — approvers must see it
  return role === "member";                               // other plain drafts are Marketing-only
}

/** Prisma where-fragment that excludes drafts the role may not see. */
export function jobVisibilityWhere(role: string | null | undefined, viewerId: string): Prisma.PostJobWhereInput {
  if (role === "member") return {};
  return {
    OR: [
      { status: { not: "draft" } },
      { approvalStatus: "pending" },
      { userId: viewerId },
    ],
  };
}
