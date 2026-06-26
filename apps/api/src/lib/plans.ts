export type PlanId = "trialing" | "creator" | "pro" | "team" | "cancelled";

export interface Plan {
  id: PlanId;
  name: string;
  maxAccounts: number;   // connected social accounts
  maxSeats: number;      // team members
  dodoProductId: string; // set in Dodo dashboard
}

export const PLANS: Record<PlanId, Plan> = {
  trialing: {
    id: "trialing",
    name: "Free Trial",
    maxAccounts: 10,
    maxSeats: 1,
    dodoProductId: "",
  },
  creator: {
    id: "creator",
    name: "Creator",
    maxAccounts: 5,
    maxSeats: 1,
    dodoProductId: process.env.DODO_PRODUCT_CREATOR ?? "",
  },
  pro: {
    id: "pro",
    name: "Pro",
    maxAccounts: 15,
    maxSeats: 1,
    dodoProductId: process.env.DODO_PRODUCT_PRO ?? "",
  },
  team: {
    id: "team",
    name: "Team",
    maxAccounts: 999,
    maxSeats: 3,
    dodoProductId: process.env.DODO_PRODUCT_TEAM ?? "",
  },
  cancelled: {
    id: "cancelled",
    name: "Cancelled",
    maxAccounts: 0,
    maxSeats: 0,
    dodoProductId: "",
  },
};

export const TRIAL_DAYS = 14;

export function getPlan(planId: string): Plan {
  return PLANS[planId as PlanId] ?? PLANS.cancelled;
}
