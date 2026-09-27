export type PlanId = "trialing" | "creator" | "pro" | "team" | "cancelled";

export interface Plan {
  id: PlanId;
  name: string;
  maxAccounts: number;                    // connected social accounts
  maxSeats: number;                       // team members (future)
  maxPostsPerMonth: number | null;        // null = unlimited
  allowReels: boolean;                    // Instagram Reels & Stories
  allowOverrides: boolean;                // per-platform text/comment overrides
  maxImagesPerPost: number;               // max carousel images per post
  allowTwitter: boolean;                  // X/Twitter posting (Pro & Team only)
  maxTwitterPostsPerMonth: number | null; // null = unlimited; 0 = blocked
  dodoProductId: string;
  // Content Library limits
  maxLibraries: number;                   // 0 = feature blocked
  maxLibraryItems: number;                // total items across all libraries
  maxDripPerDay: number;                  // hard cap on postsPerDay drip setting
}

export const PLANS: Record<PlanId, Plan> = {
  trialing: {
    id: "trialing",
    name: "Free Trial",
    maxAccounts: 3,
    maxSeats: 1,
    maxPostsPerMonth: 30,
    allowReels: true,
    allowOverrides: true,
    maxImagesPerPost: 4,
    allowTwitter: false,
    maxTwitterPostsPerMonth: 0,
    dodoProductId: "",
    maxLibraries: 0,
    maxLibraryItems: 0,
    maxDripPerDay: 0,
  },
  creator: {
    id: "creator",
    name: "Creator",
    maxAccounts: 5,
    maxSeats: 2,
    maxPostsPerMonth: 400,
    allowReels: true,
    allowOverrides: true,
    maxImagesPerPost: 4,
    allowTwitter: false,
    maxTwitterPostsPerMonth: 0,
    dodoProductId: process.env.DODO_PRODUCT_CREATOR ?? "",
    maxLibraries: 2,
    maxLibraryItems: 1000,
    maxDripPerDay: 10,
  },
  pro: {
    id: "pro",
    name: "Pro",
    maxAccounts: 15,
    maxSeats: 3,
    maxPostsPerMonth: null,
    allowReels: true,
    allowOverrides: true,
    maxImagesPerPost: 10,
    allowTwitter: true,
    maxTwitterPostsPerMonth: 100,
    dodoProductId: process.env.DODO_PRODUCT_PRO ?? "",
    maxLibraries: 5,
    maxLibraryItems: 20000,
    maxDripPerDay: 40,
  },
  team: {
    id: "team",
    name: "Team",
    maxAccounts: 50,
    maxSeats: 4,
    maxPostsPerMonth: null,
    allowReels: true,
    allowOverrides: true,
    maxImagesPerPost: 10,
    allowTwitter: true,
    maxTwitterPostsPerMonth: 100,
    dodoProductId: process.env.DODO_PRODUCT_TEAM ?? "",
    maxLibraries: 20,
    maxLibraryItems: 100000,
    maxDripPerDay: 100,
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
    allowTwitter: false,
    maxTwitterPostsPerMonth: 0,
    dodoProductId: "",
    maxLibraries: 0,
    maxLibraryItems: 0,
    maxDripPerDay: 0,
  },
};

export const TRIAL_DAYS = 14;

export function getPlan(planId: string): Plan {
  return PLANS[planId as PlanId] ?? PLANS.cancelled;
}
