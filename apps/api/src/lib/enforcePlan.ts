import { prisma } from "./prisma.js";
import { getPlan } from "./plans.js";

type Resource = "accounts";

interface PlanError {
  error: string;
  code: "TRIAL_EXPIRED" | "PLAN_LIMIT" | "CANCELLED";
  upgradeRequired: boolean;
}

/**
 * Check if a user is allowed to create a resource.
 * Returns null if allowed, or a PlanError object to send as 402 response.
 */
export async function enforcePlan(
  userId: string,
  resource: Resource
): Promise<PlanError | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { accounts: true } } },
  });

  if (!user) return { error: "User not found", code: "CANCELLED", upgradeRequired: false };

  // Cancelled plan — hard block
  if (user.planStatus === "cancelled" || user.plan === "cancelled") {
    return {
      error: "Your subscription has been cancelled. Please resubscribe to continue.",
      code: "CANCELLED",
      upgradeRequired: true,
    };
  }

  // Trial expired — hard block
  if (user.planStatus === "trialing" && user.trialEndsAt && user.trialEndsAt < new Date()) {
    return {
      error: "Your 14-day free trial has expired. Upgrade to continue.",
      code: "TRIAL_EXPIRED",
      upgradeRequired: true,
    };
  }

  // Payment on hold — grace period, still allow
  // (Dodo retries failed payments — we don't block immediately)

  const plan = getPlan(user.plan);

  if (resource === "accounts") {
    if (user._count.accounts >= plan.maxAccounts) {
      return {
        error: `Your ${plan.name} plan allows up to ${plan.maxAccounts} connected accounts. Upgrade to add more.`,
        code: "PLAN_LIMIT",
        upgradeRequired: true,
      };
    }
  }

  return null;
}
