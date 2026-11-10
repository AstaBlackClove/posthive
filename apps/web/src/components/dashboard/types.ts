// The data the dashboard sections take. Every section is a pure view over these: a fresh account
// is just the empty case (all zero), a populated one fills the same props (see lib/dashboard-data.ts).

import type { ContentStatusKey } from "@/lib/content-status";
import type { ChannelStat } from "./ChannelRow";
import type { QuickStart } from "./QuickStartStep";

export interface PlanQuarter {
  /** "Q4 2026". */
  label: string;
  /** The quarter's target, when the workspace has set one. Nothing stores one yet, so without it the cards show counts and no bar. */
  quota?: number;
  /** Posts with a date in the quarter. */
  planned: number;
}

export interface PipelineData {
  counts: Record<ContentStatusKey, number>;
}

export interface TodayPublish {
  /** Posts to go out today. */
  count: number;
  /** The first of them, by time (the count may be larger). */
  rows: ContentRow[];
}

export interface MilestoneData {
  count: number;
}

export interface ContentRow {
  id: string;
  title: string;
  /** A platform id: the first channel of the post, "" when it has none yet. */
  channel: string;
  /** How many more channels the post goes to. */
  alsoOn?: number;
  /** ISO date-time. */
  publishAt: string | null;
  owner: string | null;
  production: ContentStatusKey;
  /** Scheduled, published or failed; null for a draft, which is not on its way out yet. */
  publication: ContentStatusKey | null;
}

export type TabKey = "upcoming" | "attention" | "risk" | "activity";

export interface DashboardData {
  userName: string;
  plan: PlanQuarter;
  quickStart: QuickStart[];
  /** Hide the Quick Start banner once the account is set up. */
  quickStartDone: boolean;
  /** The banner's heading; left out for the design's own (a brand-new account). */
  quickStartTitle?: string;
  pipeline: PipelineData;
  readyToSchedule: number;
  published: number;
  needAttention: number;
  tasksToday: number;
  /** The first of the person's own posts for today (tasksToday may be larger). */
  taskRows: ContentRow[];
  today: TodayPublish;
  milestones: MilestoneData;
  channels: ChannelStat[];
  /** Counts shown in the badges of the tabs: the true totals (the lists behind them are cut). */
  tabCounts: Record<TabKey, number>;
}
