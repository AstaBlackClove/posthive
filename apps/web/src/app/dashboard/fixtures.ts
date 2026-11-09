// The dashboard of an account that has just been created: nothing planned, nothing assigned,
// no channel connected. The sections take DashboardData, so a populated account is the same
// shape with numbers in it; only this file knows the account is empty.

import type { QuickStart } from "@/components/dashboard/QuickStartStep";
import type { DashboardData } from "@/components/dashboard/types";
import { emptyStatusCounts } from "@/lib/content-status";

export const QUICK_START: QuickStart[] = [
  { step: 1, title: "Plan your quarter", description: "Import a CSV plan or set milestones for {quarter}.", cta: "Import planning", href: "/jobs/import" },
  { step: 2, title: "Create your first post", description: "Draft a post and send it into production.", cta: "Add content", href: "/compose" },
  { step: 3, title: "Connect a channel", description: "Link Instagram or LinkedIn to publish straight from {brand}.", cta: "Connect channel", href: "/accounts" },
  { step: 4, title: "Invite your team", description: "Add teammates to write, design and approve.", cta: "Invite team", href: "/team" },
];

/** The quarter a date falls in, "Q4 2026". */
export function quarterLabel(todayKey: string): string {
  const [y, m] = todayKey.split("-").map(Number);
  return `Q${Math.floor((m - 1) / 3) + 1} ${y}`;
}

export const QUARTER_QUOTA = 60;

/** A fresh account. `brand` and `userName` are filled from the app, the rest is the empty state. */
export function emptyDashboard({ userName, brand, todayKey }: { userName: string; brand: string; todayKey: string }): DashboardData {
  const quarter = quarterLabel(todayKey);
  return {
    userName,
    plan: { label: quarter, quota: QUARTER_QUOTA, planned: 0 },
    quickStart: QUICK_START.map((s) => ({ ...s, description: s.description.replace("{quarter}", quarter).replace("{brand}", brand) })),
    quickStartDone: false,
    pipeline: { counts: emptyStatusCounts() },
    readyToSchedule: 0,
    published: 0,
    needAttention: 0,
    tasksToday: 0,
    today: { count: 0 },
    milestones: { count: 0 },
    channels: [
      { platform: "instagram", handle: null, connected: false, posts: 0 },
      { platform: "linkedin", handle: null, connected: false, posts: 0 },
    ],
    tabCounts: { upcoming: 0, attention: 0, risk: 0, activity: 0 },
    rows: [],
  };
}
