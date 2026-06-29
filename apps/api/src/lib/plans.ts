export type PlanId = "trialing" | "creator" | "pro" | "team" | "cancelled";

export interface Plan {
  id: PlanId;
  name: string;
  maxAccounts: number;             // connected social accounts
  maxSeats: number;                // team members (future)
  maxPostsPerMonth: number | null; // null = unlimited
  allowReels: boolean;             // Instagram Reels & Stories
  allowOverrides: boolean;         // per-platform text/comment overrides
  maxImagesPerPost: number;        // max carousel images per post
  dodoProductId: string;
}

export const PLANS: Record<PlanId, Plan> = {
  trialing: {
    id: "trialing",
    name: "Free Trial",
    maxAccounts: 3,
    maxSeats: 1,
    maxPostsPerMonth: 30,
    allowReels: false,
    allowOverrides: false,
    maxImagesPerPost: 4,
    dodoProductId: "",
  },
  creator: {
    id: "creator",
    name: "Creator",
    maxAccounts: 5,
    maxSeats: 1,
    maxPostsPerMonth: 400,
    allowReels: false,
    allowOverrides: false,
    maxImagesPerPost: 4,
    dodoProductId: process.env.DODO_PRODUCT_CREATOR ?? "",
  },
  pro: {
    id: "pro",
    name: "Pro",
    maxAccounts: 15,
    maxSeats: 1,
    maxPostsPerMonth: null,
    allowReels: true,
    allowOverrides: true,
    maxImagesPerPost: 10,
    dodoProductId: process.env.DODO_PRODUCT_PRO ?? "",
  },
  team: {
    id: "team",
    name: "Team",
    maxAccounts: 50,
    maxSeats: 3,
    maxPostsPerMonth: null,
    allowReels: true,
    allowOverrides: true,
    maxImagesPerPost: 10,
    dodoProductId: process.env.DODO_PRODUCT_TEAM ?? "",
  },
  cancelled: {
    id: "cancelled",
    name: "Cancelled",
    maxAccounts: 0,
    maxSeats: 0,
    maxPostsPerMonth: 0,
    allowReels: false,
    allowOverrides: false,
    maxImagesPerPost: 0,
    dodoProductId: "",
  },
};

export const TRIAL_DAYS = 14;

export function getPlan(planId: string): Plan {
  return PLANS[planId as PlanId] ?? PLANS.cancelled;
}
