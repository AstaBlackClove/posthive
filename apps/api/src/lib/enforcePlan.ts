import { prisma } from "./prisma.js";
import { getPlan } from "./plans.js";
import type { PrismaClient } from "@prisma/client";

/**
 * "accounts"   — checks status + connected-account count limit
 * "scheduling" — checks status + monthly post count limit
 * "reels"      — checks allowReels flag (Pro/Team only)
 * "overrides"  — checks allowOverrides flag (Pro/Team only)
 * "seats"      — checks team member seat limit (Team plan only allows invites)
 */
export type PlanResource = "accounts" | "scheduling" | "reels" | "overrides" | "seats" | "libraries" | "libraryItems";

export interface PlanError {
  error: string;
  code: "INACTIVE" | "TRIAL_EXPIRED" | "PLAN_LIMIT" | "CANCELLED" | "ON_HOLD";
  upgradeRequired: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"> | any;

export async function enforcePlan(
  userId: string,
  workspaceId: string,
  resource: PlanResource,
  db: TxClient = prisma,
): Promise<PlanError | null> {
  // Billing disabled — self-hosted mode, no limits enforced
  if (process.env.ENABLE_BILLING !== "true") return null;

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      plan: true,
      planStatus: true,
      trialEndsAt: true,
      allowReels: true,
      allowOverrides: true,
      customMaxLibraries: true,
      customMaxLibraryItems: true,
      _count: { select: { accounts: true, members: true, contentLibraries: true } },
    },
  });

  if (!workspace) return { error: "Workspace not found", code: "CANCELLED", upgradeRequired: false };

  if (workspace.planStatus === "cancelled" || workspace.plan === "cancelled") {
    return {
      error: "Your subscription has been cancelled. Resubscribe to continue using Posthive.",
      code: "CANCELLED",
      upgradeRequired: true,
    };
  }

  if (workspace.planStatus === "on_hold") {
    return {
      error: "Your subscription is on hold due to a payment issue. Update your payment method to continue using Posthive.",
      code: "ON_HOLD",
      upgradeRequired: true,
    };
  }

  if (workspace.planStatus === "trialing" && workspace.trialEndsAt && workspace.trialEndsAt < new Date()) {
    return {
      error: "Your 14-day free trial has expired. Upgrade to keep scheduling posts.",
      code: "TRIAL_EXPIRED",
      upgradeRequired: true,
    };
  }

  const plan = getPlan(workspace.plan);

  if (resource === "accounts") {
    if (workspace._count.accounts >= plan.maxAccounts) {
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

    const postsThisMonth = await db.postJob.count({
      where: { workspaceId, createdAt: { gte: startOfMonth } },
    });

    if (postsThisMonth >= plan.maxPostsPerMonth) {
      const isTrialing = workspace.planStatus === "trialing";
      return {
        error: isTrialing
          ? `Your free trial allows up to ${plan.maxPostsPerMonth} scheduled posts. Upgrade to continue scheduling.`
          : `Your ${plan.name} plan allows up to ${plan.maxPostsPerMonth} posts per month. Upgrade to Pro for unlimited posts.`,
        code: "PLAN_LIMIT",
        upgradeRequired: true,
      };
    }
  }

  if (resource === "seats") {
    if (workspace._count.members >= plan.maxSeats) {
      const isTrialing = workspace.planStatus === "trialing";
      return {
        error: isTrialing
          ? "Team members are not available during the free trial. Upgrade to a paid plan to invite members."
          : `Your ${plan.name} plan supports up to ${plan.maxSeats} seat${plan.maxSeats === 1 ? "" : "s"} (including yourself). Upgrade to invite more members.`,
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

  const maxLibraries = workspace.customMaxLibraries ?? plan.maxLibraries;
  const maxLibraryItems = workspace.customMaxLibraryItems ?? plan.maxLibraryItems;

  if (resource === "libraries") {
    if (maxLibraries === 0) {
      return {
        error: "Content Library is not available on your current plan. Upgrade to Creator or higher to use this feature.",
        code: "PLAN_LIMIT",
        upgradeRequired: true,
      };
    }
    if (workspace._count.contentLibraries >= maxLibraries) {
      const nextPlan = workspace.plan === "creator" ? "Pro" : workspace.plan === "pro" ? "Team" : null;
      const upgradeHint = nextPlan ? ` Upgrade to ${nextPlan} to create more.` : " Contact support to increase your limit.";
      return {
        error: `You've reached your plan limit of ${maxLibraries} content librar${maxLibraries === 1 ? "y" : "ies"}.${upgradeHint}`,
        code: "PLAN_LIMIT",
        upgradeRequired: true,
      };
    }
  }

  if (resource === "libraryItems") {
    const itemCount = await db.libraryItem.count({ where: { workspaceId } });
    if (itemCount >= maxLibraryItems) {
      return {
        error: `You've reached your library item limit of ${maxLibraryItems.toLocaleString()} items. Delete some items or upgrade your plan.`,
        code: "PLAN_LIMIT",
        upgradeRequired: true,
      };
    }
  }

  return null;
}
