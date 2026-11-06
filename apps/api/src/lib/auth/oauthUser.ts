import { prisma } from "../prisma.js";
import { sendWelcomeEmail } from "../mailer.js";
import { authProvider } from "./index.js";

/**
 * Sign-in with an OAuth provider (local auth mode): find the user by email, or create the
 * user + 14-day trial workspace and send the welcome email.
 *
 * The caller must only pass an email the provider says is verified. If the account only exists
 * because someone signed up with that email WITHOUT verifying it, drop that sign-up's password
 * and sessions, so whoever typed the address can no longer get into the real owner's account.
 */
export async function findOrCreateOAuthUser(p: {
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}) {
  const existing = await prisma.user.findUnique({ where: { email: p.email } });

  if (existing) {
    const data: { avatarUrl?: string; emailVerified?: boolean; passwordHash?: null } = {};
    // Backfill avatar for users who signed up before the provider picture was saved
    if (p.avatarUrl && !existing.avatarUrl) data.avatarUrl = p.avatarUrl;
    const takeOver = !existing.emailVerified;
    if (takeOver) { data.emailVerified = true; data.passwordHash = null; }

    if (Object.keys(data).length === 0) return { user: existing, isNew: false };
    const user = await prisma.user.update({ where: { id: existing.id }, data });
    if (takeOver) await authProvider.revokeOtherSessions?.(existing.id);
    return { user, isNew: false };
  }

  const user = await prisma.user.create({
    data: {
      email: p.email,
      name: p.name ?? p.email.split("@")[0],
      avatarUrl: p.avatarUrl ?? null,
      emailVerified: true,
    },
  });
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const workspace = await prisma.workspace.create({
    data: {
      name: `${user.name}'s Workspace`,
      plan: "trialing",
      planStatus: "trialing",
      trialEndsAt,
      allowTrial: false,
      members: { create: { userId: user.id, role: "owner" } },
    },
  });
  await prisma.user.update({ where: { id: user.id }, data: { activeWorkspaceId: workspace.id } });
  sendWelcomeEmail(user.email, user.name ?? "there").catch(() => {});
  return { user, isNew: true };
}
