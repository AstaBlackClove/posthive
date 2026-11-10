// Turns what GET /dashboard and /dashboard/calendar answer into the DashboardData the sections take
// (components/dashboard/types.ts). Pure: no fetching and no clock, so the rules are tested alone.
//
// What a post is in the dashboard's terms:
//  - production stage, from what the app records: a plain draft is "Brief needed" (nobody records
//    copywriting or design work yet, so those two stages stay at 0 until the app tracks them),
//    waiting for review is "In review", sent back is "Changes requested", approved is "Approved".
//  - publication stage: scheduled while it is waiting for its time, published once it went out,
//    failed when the worker could not publish it; a draft has none yet.

import type { ContentRow, DashboardData, TabKey } from "@/components/dashboard/types";
import type { QuickStart } from "@/components/dashboard/QuickStartStep";
import type { ChannelStat } from "@/components/dashboard/ChannelRow";
import { emptyStatusCounts, type ContentStatusKey } from "@/lib/content-status";
import { STATUS_GROUPS } from "@/lib/postList";

// ── The API's answer ────────────────────────────────────────────────────────

export interface ApiPost {
  id: string;
  title: string;
  status: string;
  approvalStatus: string | null;
  scheduledFor: string | null;
  channels: string[];
  owner: string | null;
}

export interface ApiList {
  count: number;
  posts: ApiPost[];
}

export interface ApiDashboard {
  quarter: { label: string; planned: number; published: number };
  inProduction: Array<{ status: string; approvalStatus: string | null; count: number }>;
  readyToSchedule: number;
  needAttention: number;
  todayPosts: ApiList;
  myTasks: ApiList;
  lists: Record<TabKey, ApiList>;
  channels: Array<{ platform: string; accounts: number; handle: string; posts: number }>;
  setup: { imported: boolean; created: boolean; accounts: number; members: number; invites: number };
}

export interface ApiCalendar {
  from: string;
  to: string;
  posts: ApiPost[];
  truncated: boolean;
}

// ── A post's two statuses ───────────────────────────────────────────────────

const inGroup = (group: readonly string[], status: string) => group.includes(status);

/** Where a post is in making it: only the stages the app records. */
export function productionOf(post: Pick<ApiPost, "status" | "approvalStatus">): ContentStatusKey {
  if (post.status === "draft") {
    if (post.approvalStatus === "pending") return "review";
    if (post.approvalStatus === "rejected") return "changes";
    return "brief";
  }
  // Once it is scheduled or out, making it is over: it was approved (or never needed approval)
  return "approved";
}

/** Where a post is in getting out: scheduled, published, failed, or not yet any of them (null: a draft). */
export function publicationOf(post: Pick<ApiPost, "status">): ContentStatusKey | null {
  if (inGroup(STATUS_GROUPS.pending, post.status)) return "scheduled";
  if (inGroup(STATUS_GROUPS.done, post.status)) return "published";
  if (inGroup(STATUS_GROUPS.failed, post.status)) return "failed";
  return null;
}

/** The table's row. A draft has no publication stage yet (null), it is not given one it has not reached. */
export function toContentRow(post: ApiPost): ContentRow {
  const production = productionOf(post);
  return {
    id: post.id,
    title: post.title,
    channel: post.channels[0] ?? "",
    alsoOn: Math.max(0, post.channels.length - 1),
    publishAt: post.scheduledFor,
    owner: post.owner,
    production,
    publication: publicationOf(post),
  };
}

// ── The pipeline ────────────────────────────────────────────────────────────

/**
 * A count for every stage from the (status, approval) pairs the API sends (posts not out yet).
 * A draft is where its approval says. Approving a post schedules it, so "Approved" is a scheduled
 * post that went through approval; one scheduled straight away never was in production and is not
 * counted here (it shows as Scheduled in the table and on the calendar).
 */
export function pipelineCounts(groups: ApiDashboard["inProduction"]): Record<ContentStatusKey, number> {
  const counts = emptyStatusCounts();
  for (const g of groups) {
    if (g.status === "draft") counts[productionOf(g)] += g.count;
    else if (g.approvalStatus === "approved" && inGroup(STATUS_GROUPS.pending, g.status)) counts.approved += g.count;
  }
  return counts;
}

// ── Quick start ─────────────────────────────────────────────────────────────

export const QUICK_START: QuickStart[] = [
  { step: 1, title: "Plan your quarter", description: "Import a CSV plan or set milestones for {quarter}.", cta: "Import planning", href: "/jobs/import" },
  { step: 2, title: "Create your first post", description: "Draft a post and send it into production.", cta: "Add content", href: "/compose" },
  { step: 3, title: "Connect a channel", description: "Link Instagram or LinkedIn to publish straight from {brand}.", cta: "Connect channel", href: "/accounts" },
  { step: 4, title: "Invite your team", description: "Add teammates to write, design and approve.", cta: "Invite team", href: "/team" },
];

/**
 * The steps still to do, with their words filled in. A person only sees steps they may do: the
 * links go to pages their role opens (a designer cannot create content, only an owner or admin
 * connects channels or invites people), so a step they could not take is not theirs to finish.
 */
export function quickStart(
  setup: ApiDashboard["setup"],
  quarter: string,
  brand: string,
  canAccess: (href: string) => boolean = () => true,
): { steps: QuickStart[]; done: boolean; title?: string } {
  const doneBy = [setup.imported, setup.created, setup.accounts > 0, setup.members > 1 || setup.invites > 0];
  const steps = QUICK_START.filter((step, i) => !doneBy[i] && canAccess(step.href)).map((s) => ({
    ...s,
    description: s.description.replace("{quarter}", quarter).replace("{brand}", brand),
  }));
  // "Let's get your first campaign live" is for a workspace where nothing is done; once something is, it is about finishing
  const started = doneBy.some(Boolean);
  return { steps, done: steps.length === 0, ...(started ? { title: `Finish setting up ${brand}` } : {}) };
}

// ── Channels ────────────────────────────────────────────────────────────────

/** The channels the design always shows (Instagram and LinkedIn), plus any other the workspace has connected. */
const DEFAULT_CHANNELS = ["instagram", "linkedin"] as const;

export function channelStats(channels: ApiDashboard["channels"]): ChannelStat[] {
  const connected = new Map(channels.map((c) => [c.platform, c]));
  const stat = (platform: string): ChannelStat => {
    const c = connected.get(platform);
    return c ? { platform, handle: c.handle, connected: true, posts: c.posts } : { platform, handle: null, connected: false, posts: 0 };
  };
  return [...DEFAULT_CHANNELS, ...channels.map((c) => c.platform).filter((p) => !(DEFAULT_CHANNELS as readonly string[]).includes(p))].map(stat);
}

// ── The whole page ──────────────────────────────────────────────────────────

export interface Build {
  api: ApiDashboard;
  userName: string;
  brand: string;
  /** Whether the person's role opens a page; every page when not given. */
  canAccess?: (href: string) => boolean;
}

export function toDashboardData({ api, userName, brand, canAccess }: Build): DashboardData {
  const { steps, done, title } = quickStart(api.setup, api.quarter.label, brand, canAccess);
  return {
    userName,
    plan: { label: api.quarter.label, planned: api.quarter.planned },
    quickStart: steps,
    quickStartDone: done,
    quickStartTitle: title,
    pipeline: { counts: pipelineCounts(api.inProduction) },
    readyToSchedule: api.readyToSchedule,
    published: api.quarter.published,
    needAttention: api.needAttention,
    tasksToday: api.myTasks.count,
    taskRows: api.myTasks.posts.map(toContentRow),
    today: { count: api.todayPosts.count, rows: api.todayPosts.posts.map(toContentRow) },
    milestones: { count: 0 },
    channels: channelStats(api.channels),
    tabCounts: {
      upcoming: api.lists.upcoming.count,
      attention: api.lists.attention.count,
      risk: api.lists.risk.count,
      activity: api.lists.activity.count,
    },
  };
}

/** The rows of each tab, so switching tab does not ask the server again. */
export function rowsByTab(api: ApiDashboard): Record<TabKey, ContentRow[]> {
  return {
    upcoming: api.lists.upcoming.posts.map(toContentRow),
    attention: api.lists.attention.posts.map(toContentRow),
    risk: api.lists.risk.posts.map(toContentRow),
    activity: api.lists.activity.posts.map(toContentRow),
  };
}

// ── The calendar ────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  /** The WIB day, "YYYY-MM-DD". */
  day: string;
  channels: string[];
  status: ContentStatusKey;
}

/** The status a post shows on the calendar: published and scheduled win, then where it is in production. */
export function calendarStatus(post: ApiPost): ContentStatusKey {
  return publicationOf(post) ?? productionOf(post);
}

/** Posts of a range as calendar events, each on its WIB day; a post with no date has no day and is left out. */
export function toCalendarEvents(posts: ApiPost[], dayOf: (iso: string) => string): CalendarEvent[] {
  return posts.flatMap((p) =>
    p.scheduledFor ? [{ id: p.id, title: p.title, day: dayOf(p.scheduledFor), channels: p.channels, status: calendarStatus(p) }] : []
  );
}

/** Events grouped by day, in the order they came (the API sends them by time). */
export function eventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const day = map.get(e.day);
    if (day) day.push(e);
    else map.set(e.day, [e]);
  }
  return map;
}
