import type { FastifyRequest, FastifyReply } from "fastify";
import { authProvider } from "./index.js";
import type { AuthUser } from "./types.js";
import { prisma } from "../prisma.js";

const ACCESS_COOKIE = "ss-access-token";
const REFRESH_COOKIE = "ss-refresh-token";

export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production" || process.env.SECURE_COOKIES === "true",
  path: "/",
};

export const ACCESS_COOKIE_NAME = ACCESS_COOKIE;
export const REFRESH_COOKIE_NAME = REFRESH_COOKIE;

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
    workspaceId?: string | null;
  }
}

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

  // Resolve from DB: activeWorkspaceId, fall back to first membership
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      activeWorkspaceId: true,
      workspaceMembers: {
        orderBy: { joinedAt: "asc" },
        take: 1,
        select: { workspaceId: true },
      },
    },
  });

  req.workspaceId =
    dbUser?.activeWorkspaceId ??
    dbUser?.workspaceMembers[0]?.workspaceId ??
    null;
}

async function resolveUser(
  req: FastifyRequest,
  reply: FastifyReply,
  accessToken: string | undefined,
): Promise<boolean> {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];

  if (!accessToken && !refreshToken) {
    await reply.status(401).send({ error: "Not authenticated" });
    return false;
  }

  // Try access token first
  if (accessToken) {
    const user = await authProvider.validateAccessToken(accessToken);
    if (user) {
      req.user = user;
      await resolveWorkspace(req, user.id);
      return true;
    }
  }

  // Access token expired — try refresh
  if (refreshToken) {
    const tokens = await authProvider.refreshTokens(refreshToken);
    if (tokens) {
      reply.setCookie(ACCESS_COOKIE, tokens.accessToken, {
        ...COOKIE_OPTS,
        maxAge: 15 * 60, // 15 min
      });
      reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, {
        ...COOKIE_OPTS,
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });

      const user = await authProvider.validateAccessToken(tokens.accessToken);
      if (user) {
        req.user = user;
        await resolveWorkspace(req, user.id);
        return true;
      }
    }
  }

  // Clear bad cookies
  reply.clearCookie(ACCESS_COOKIE, { path: "/" });
  reply.clearCookie(REFRESH_COOKIE, { path: "/" });
  await reply.status(401).send({ error: "Session expired — please log in again" });
  return false;
}

// Fastify preHandler — cookies only, no query param.
// Use this on all routes except SSE.
export async function withAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const accessToken = req.cookies?.[ACCESS_COOKIE];
  await resolveUser(req, reply, accessToken);
}

// For the SSE route only — also accepts ?token= query param because EventSource
// cannot send cookies cross-origin. Do not use on any other route.
export async function withAuthOrToken(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const queryToken = (req.query as Record<string, string>)?.token;
  const accessToken = queryToken ?? req.cookies?.[ACCESS_COOKIE];
  await resolveUser(req, reply, accessToken);
}

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
