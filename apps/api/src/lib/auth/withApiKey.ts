import type { FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import { prisma } from "../prisma.js";
import { getPlan } from "../plans.js";

export interface ApiKeyUser {
  id: string;
  plan: string;
  planStatus: string;
}

declare module "fastify" {
  interface FastifyRequest {
    apiKeyUser?: ApiKeyUser;
  }
}

function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function withApiKey(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing API key. Pass Authorization: Bearer <key>" });
  }

  const raw = authHeader.slice(7).trim();
  if (!raw.startsWith("ph_")) {
    return reply.status(401).send({ error: "Invalid API key format" });
  }

  const keyHash = hashKey(raw);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: { select: { id: true, plan: true, planStatus: true } } },
  });

  if (!apiKey || apiKey.revokedAt) {
    return reply.status(401).send({ error: "Invalid or revoked API key" });
  }

  // Update lastUsedAt without blocking the request
  prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  req.apiKeyUser = apiKey.user;
}

/** Check if a user is allowed to use the API (plan gate). */
export function canUseApi(plan: string, planStatus: string): boolean {
  // Self-hosters (billing disabled) always get access
  if (process.env.ENABLE_BILLING !== "true") return true;
  // Trialing/Creator plans don't get API access
  if (planStatus !== "active") return false;
  return plan === "pro" || plan === "team";
}

/** Max API keys per plan. */
export function maxApiKeys(plan: string): number {
  if (process.env.ENABLE_BILLING !== "true") return 10;
  if (plan === "team") return 10;
  if (plan === "pro") return 3;
  return 0;
}

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const secret = crypto.randomBytes(32).toString("hex");
  const raw = `ph_${secret}`;
  const hash = hashKey(raw);
  const prefix = raw.slice(0, 12);
  return { raw, hash, prefix };
}
