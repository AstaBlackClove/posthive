import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";
import type { AuthProvider, AuthUser, TokenPair } from "./types.js";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXPIRES = "2h";
const REFRESH_EXPIRES_DAYS = 30;

function signAccess(userId: string): string {
  return jwt.sign({ sub: userId, type: "access" }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function signRefresh(userId: string): string {
  return jwt.sign({ sub: userId, type: "refresh" }, REFRESH_SECRET, { expiresIn: `${REFRESH_EXPIRES_DAYS}d` });
}

export const localAuthProvider: AuthProvider = {
  async register(email, password, name) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("Email already in use");

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      // planStatus "inactive" = registered but hasn't started a Dodo trial yet.
      // Dodo checkout sets planStatus → "trialing" once the user enters their card.
      data: { email, name, passwordHash, plan: "trialing", planStatus: "inactive" },
    });

    const accessToken = signAccess(user.id);
    const refreshToken = signRefresh(user.id);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_EXPIRES_DAYS * 86400 * 1000),
      },
    });

    return { user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, timezone: user.timezone }, accessToken, refreshToken };
  },

  async login(email, password) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw new Error("Invalid email or password");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error("Invalid email or password");

    // Clean up only expired tokens — keep valid sessions alive across devices
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    });

    const accessToken = signAccess(user.id);
    const refreshToken = signRefresh(user.id);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_EXPIRES_DAYS * 86400 * 1000),
      },
    });

    return { user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, timezone: user.timezone }, accessToken, refreshToken };
  },

  async validateAccessToken(token) {
    try {
      const payload = jwt.verify(token, ACCESS_SECRET) as { sub: string; type: string };
      if (payload.type !== "access") return null;
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) return null;
      return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, timezone: user.timezone };
    } catch {
      return null;
    }
  },

  async refreshTokens(refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, REFRESH_SECRET) as { sub: string; type: string };
      if (payload.type !== "refresh") return null;

      const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
      if (!stored || stored.expiresAt < new Date()) {
        if (stored) await prisma.refreshToken.delete({ where: { token: refreshToken } });
        return null;
      }

      // Issue new access token but keep the same refresh token to avoid
      // race conditions when multiple parallel requests trigger refresh simultaneously.
      const newAccess = signAccess(payload.sub);

      // Extend refresh token expiry on use
      await prisma.refreshToken.update({
        where: { token: refreshToken },
        data: { expiresAt: new Date(Date.now() + REFRESH_EXPIRES_DAYS * 86400 * 1000) },
      });

      return { accessToken: newAccess, refreshToken };
    } catch {
      return null;
    }
  },

  async logout(refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  },
};
