export type PlanId = "trialing" | "creator" | "pro" | "team" | "cancelled";

export interface Plan {
  id: PlanId;
  name: string;
  maxAccounts: number;          // connected social accounts
  maxSeats: number;             // team members (future)
  maxPostsPerMonth: number | null; // null = unlimited
  dodoProductId: string;
}

export const PLANS: Record<PlanId, Plan> = {
  trialing: {
    id: "trialing",
    name: "Free Trial",
    maxAccounts: 3,
    maxSeats: 1,
    maxPostsPerMonth: 30,        // enough to test; motivates upgrade
    dodoProductId: "",
  },
  creator: {
    id: "creator",
    name: "Creator",
    maxAccounts: 5,
    maxSeats: 1,
    maxPostsPerMonth: 400,
    dodoProductId: process.env.DODO_PRODUCT_CREATOR ?? "",
  },
  pro: {
    id: "pro",
    name: "Pro",
    maxAccounts: 15,
    maxSeats: 1,
    maxPostsPerMonth: null,      // unlimited
    dodoProductId: process.env.DODO_PRODUCT_PRO ?? "",
  },
  team: {
    id: "team",
    name: "Team",
    maxAccounts: 50,
    maxSeats: 3,
    maxPostsPerMonth: null,      // unlimited
    dodoProductId: process.env.DODO_PRODUCT_TEAM ?? "",
  },
  cancelled: {
    id: "cancelled",
    name: "Cancelled",
    maxAccounts: 0,
    maxSeats: 0,
    maxPostsPerMonth: 0,
    dodoProductId: "",
  },
};

export const TRIAL_DAYS = 14;

export function getPlan(planId: string): Plan {
  return PLANS[planId as PlanId] ?? PLANS.cancelled;
}
