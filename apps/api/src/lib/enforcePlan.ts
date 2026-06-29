import { prisma } from "./prisma.js";
import { getPlan } from "./plans.js";

/**
 * "accounts"   — checks status + connected-account count limit
 * "scheduling" — checks status + monthly post count limit
 * "reels"      — checks allowReels flag (Pro/Team only)
 * "overrides"  — checks allowOverrides flag (Pro/Team only)
 */
export type PlanResource = "accounts" | "scheduling" | "reels" | "overrides";

export interface PlanError {
  error: string;
  code: "INACTIVE" | "TRIAL_EXPIRED" | "PLAN_LIMIT" | "CANCELLED";
  upgradeRequired: boolean;
}

export async function enforcePlan(
  userId: string,
  resource: PlanResource
): Promise<PlanError | null> {
  // Billing disabled — self-hosted mode, no limits enforced
  if (process.env.ENABLE_BILLING !== "true") return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { accounts: true } } },
  });

  if (!user) return { error: "User not found", code: "CANCELLED", upgradeRequired: false };

  // Registered but hasn't entered card / started Dodo trial yet
  if (user.planStatus === "inactive") {
    return {
      error: "Start your free 14-day trial to use Posthive. A card is required — you won't be charged until the trial ends.",
      code: "INACTIVE",
      upgradeRequired: true,
    };
  }

  if (user.planStatus === "cancelled" || user.plan === "cancelled") {
    return {
      error: "Your subscription has been cancelled. Resubscribe to continue using Posthive.",
      code: "CANCELLED",
      upgradeRequired: true,
    };
  }

  if (user.planStatus === "trialing" && user.trialEndsAt && user.trialEndsAt < new Date()) {
    return {
      error: "Your 14-day free trial has expired. Upgrade to keep scheduling posts.",
      code: "TRIAL_EXPIRED",
      upgradeRequired: true,
    };
  }

  const plan = getPlan(user.plan);

  if (resource === "accounts") {
    if (user._count.accounts >= plan.maxAccounts) {
      return {
        error: `Your ${plan.name} plan supports up to ${plan.maxAccounts} connected account${plan.maxAccounts === 1 ? "" : "s"}. Upgrade to connect more.`,
        code: "PLAN_LIMIT",
        upgradeRequired: true,
      };
    }
  }

  if (resource === "scheduling" && plan.maxPostsPerMonth !== null) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const postsThisMonth = await prisma.postJob.count({
      where: { userId, createdAt: { gte: startOfMonth } },
    });

    if (postsThisMonth >= plan.maxPostsPerMonth) {
      const isTrialing = user.planStatus === "trialing";
      return {
        error: isTrialing
          ? `Your free trial allows up to ${plan.maxPostsPerMonth} scheduled posts. Upgrade to continue scheduling.`
          : `Your ${plan.name} plan allows up to ${plan.maxPostsPerMonth} posts per month. Upgrade to Pro for unlimited posts.`,
        code: "PLAN_LIMIT",
        upgradeRequired: true,
      };
    }
  }

  if (resource === "reels" && !plan.allowReels) {
    return {
      error: `Instagram Reels & Stories are available on the Pro plan and above. Upgrade to unlock.`,
      code: "PLAN_LIMIT",
      upgradeRequired: true,
    };
  }

  if (resource === "overrides" && !plan.allowOverrides) {
    return {
      error: `Per-platform customization is available on the Pro plan and above. Upgrade to unlock.`,
      code: "PLAN_LIMIT",
      upgradeRequired: true,
    };
  }

  return null;
}
