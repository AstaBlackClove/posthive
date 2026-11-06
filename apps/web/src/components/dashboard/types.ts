// The data the dashboard sections take. Every section is a pure view over these: a fresh account
// is just the empty case (see app/dashboard/fixtures.ts), a populated account fills the same props.

import type { ContentStatusKey } from "@/lib/content-status";
import type { ChannelStat } from "./ChannelRow";
import type { QuickStart } from "./QuickStartStep";

export interface PlanQuarter {
  /** "Q4 2026". */
  label: string;
  /** Posts planned for the quarter (the quota). */
  quota: number;
  planned: number;
}

export interface PipelineData {
  counts: Record<ContentStatusKey, number>;
}

export interface TodayPublish {
  /** Posts to go out today, with their approval state. */
  count: number;
}

export interface MilestoneData {
  count: number;
}

export interface ContentRow {
  id: string;
  title: string;
  /** A platform id. */
  channel: string;
  /** ISO date-time. */
  publishAt: string | null;
  owner: string | null;
  production: ContentStatusKey;
  publication: ContentStatusKey;
}

export type TabKey = "upcoming" | "attention" | "risk" | "activity";

export interface DashboardData {
  userName: string;
  plan: PlanQuarter;
  quickStart: QuickStart[];
  /** Hide the Quick Start banner once the account is set up. */
  quickStartDone: boolean;
  pipeline: PipelineData;
  readyToSchedule: number;
  published: number;
  needAttention: number;
  tasksToday: number;
  today: TodayPublish;
  milestones: MilestoneData;
  channels: ChannelStat[];
  /** Counts shown in the badges of the tabs. */
  tabCounts: Record<TabKey, number>;
  rows: ContentRow[];
}
