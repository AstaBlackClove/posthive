import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";
import type { AuthProvider, AuthUser } from "./types.js";
import { createSessionService } from "./sessionService.js";
import { prismaSessionStore } from "./prismaSessionStore.js";
import { ACCESS_TTL_MS } from "./sessionPolicy.js";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;

// Access JWT is short-lived and carries the server-side session id (`sid`).
// Refresh tokens are opaque, hashed in the DB and rotated on every use.
// Policy numbers live in sessionPolicy.ts.
export const sessions = createSessionService({ store: prismaSessionStore });

function signAccess(userId: string, sessionId: string): string {
  return jwt.sign({ sub: userId, sid: sessionId, type: "access" }, ACCESS_SECRET, {
    expiresIn: Math.floor(ACCESS_TTL_MS / 1000),
  });
}

function toAuthUser(user: { id: string; email: string; name: string; avatarUrl: string | null; timezone: string }): AuthUser {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, timezone: user.timezone };
}

export const localAuthProvider: AuthProvider = {
  async register(email, password, name) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("Email already in use");

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
    });

    // Create personal workspace with 14-day trial (no card required)
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const workspace = await prisma.workspace.create({
      data: {
        name: `${name}'s Workspace`,
        plan: "trialing",
        planStatus: "trialing",
        trialEndsAt,
        allowTrial: false, // trial already started — prevent re-use
        members: { create: { userId: user.id, role: "owner" } },
      },
    });
    await prisma.user.update({ where: { id: user.id }, data: { activeWorkspaceId: workspace.id } });

    const { sessionId, refreshToken } = await sessions.create(user.id);
    return { user: toAuthUser(user), accessToken: signAccess(user.id, sessionId), refreshToken };
  },

  async login(email, password) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw new Error("Invalid email or password");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error("Invalid email or password");

    // Other devices keep their own sessions; expired ones are removed lazily on use.
    const { sessionId, refreshToken } = await sessions.create(user.id);
    return { user: toAuthUser(user), accessToken: signAccess(user.id, sessionId), refreshToken };
  },

  async validateAccessToken(token) {
    try {
      const payload = jwt.verify(token, ACCESS_SECRET) as { sub: string; sid?: string; type: string };
      // Tokens without `sid` predate server-side sessions — reject so they die at deploy.
      if (payload.type !== "access" || !payload.sid) return null;

      const session = await sessions.authenticate(payload.sid);
      if (!session || session.userId !== payload.sub) return null;

      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) return null;
      return { ...toAuthUser(user), sessionId: payload.sid };
    } catch {
      return null;
    }
  },

  async refreshTokens(refreshToken) {
    const res = await sessions.refresh(refreshToken);
    if (!res) return null;
    return { accessToken: signAccess(res.userId, res.sessionId), refreshToken: res.refreshToken };
  },

  async logout(refreshToken, sessionId) {
    if (sessionId) await sessions.revoke(sessionId);
    if (refreshToken) await sessions.revokeByToken(refreshToken);
  },

  async revokeOtherSessions(userId, keepSessionId) {
    await sessions.revokeAllForUser(userId, keepSessionId);
  },
};

export async function createLocalTokens(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
  const { sessionId, refreshToken } = await sessions.create(userId);
  return { accessToken: signAccess(userId, sessionId), refreshToken };
}
