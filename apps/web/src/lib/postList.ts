// Pure list logic for the Posts page: status filters, section grouping, counts and sorting.

export type FilterTab = "all" | "draft" | "review" | "rejected" | "pending" | "done" | "failed";
export type Section = "draft" | "upcoming" | "past";
export type JobSort = "soonest" | "latest" | "newest" | "oldest" | "title";

/** The slice of a Job these helpers read — the page's full Job satisfies it. */
export interface ListJob {
  id: string;
  status: string;
  approvalStatus?: string | null;
  scheduledFor: string | null;
  createdAt: string;
  content: string;
  targets: { account?: { platform: string } | null }[];
}

export type JobCounts = Record<FilterTab, number>;

/** PostJob.status values behind each status filter — mirrors apps/api/src/lib/jobFilters.ts. */
export const STATUS_GROUPS = {
  pending: ["pending", "running"],
  done: ["done", "comment_done", "post_done"],
  failed: ["failed", "post_failed", "comment_failed"],
} as const;

export const DEFAULT_SORT: JobSort = "soonest";

export const JOB_SORTS: { id: JobSort; label: string }[] = [
  { id: "soonest", label: "Soonest" },
  { id: "latest", label: "Latest" },
  { id: "newest", label: "Newest created" },
  { id: "oldest", label: "Oldest created" },
  { id: "title", label: "Title A–Z" },
];

const inGroup = (group: readonly string[], status: string) => group.includes(status);

/** Filter bucket of a job. Drafts split by approval state; "all" is never returned. */
export function filterOf(j: ListJob): Exclude<FilterTab, "all"> | null {
  if (j.status === "draft") {
    if (j.approvalStatus === "pending") return "review";
    if (j.approvalStatus === "rejected") return "rejected";
    return "draft";
  }
  if (inGroup(STATUS_GROUPS.pending, j.status)) return "pending";
  if (inGroup(STATUS_GROUPS.done, j.status)) return "done";
  if (inGroup(STATUS_GROUPS.failed, j.status)) return "failed";
  return null;
}

export function matchesPlatform(j: ListJob, platform: string): boolean {
  return platform === "all" || j.targets.some((t) => t.account?.platform === platform);
}

export function matchesFilter(j: ListJob, filter: FilterTab, platform: string): boolean {
  if (!matchesPlatform(j, platform)) return false;
  return filter === "all" || filterOf(j) === filter;
}

/** Counts per chip from the FULL list — never from an already-filtered one. Only the platform filter applies. */
export function countJobs(jobs: ListJob[], platform = "all"): JobCounts {
  const counts: JobCounts = { all: 0, draft: 0, review: 0, rejected: 0, pending: 0, done: 0, failed: 0 };
  for (const j of jobs) {
    if (!matchesPlatform(j, platform)) continue;
    counts.all += 1;
    const f = filterOf(j);
    if (f) counts[f] += 1;
  }
  return counts;
}

/** List section a job is shown in. */
export function sectionOf(j: ListJob): Section {
  if (j.status === "draft") return "draft";
  if (inGroup(STATUS_GROUPS.pending, j.status)) return "upcoming";
  return "past";
}

export function jobTitle(j: Pick<ListJob, "content">): string {
  try {
    const c = JSON.parse(j.content) as { text?: string; title?: string };
    return c.title?.trim() || c.text?.trim() || "Untitled";
  } catch {
    return "Untitled";
  }
}

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : NaN);
const byId = (a: ListJob, b: ListJob) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Sorts one section. Returns a new array.
 * Date sorts put jobs without a schedule last, in both directions.
 * "soonest" = closest to now: ascending for drafts/upcoming, newest-first for past.
 */
export function sortJobs<T extends ListJob>(jobs: T[], sort: JobSort, section: Section): T[] {
  const dir = (asc: boolean) => (asc ? 1 : -1);
  const compare = (a: T, b: T): number => {
    switch (sort) {
      case "soonest":
      case "latest": {
        const ta = time(a.scheduledFor);
        const tb = time(b.scheduledFor);
        const aNone = Number.isNaN(ta);
        const bNone = Number.isNaN(tb);
        if (aNone || bNone) return aNone === bNone ? 0 : aNone ? 1 : -1;
        const soonestAsc = section !== "past";
        return (ta - tb) * dir(sort === "soonest" ? soonestAsc : !soonestAsc);
      }
      case "newest":
        return time(b.createdAt) - time(a.createdAt);
      case "oldest":
        return time(a.createdAt) - time(b.createdAt);
      case "title":
        return jobTitle(a).localeCompare(jobTitle(b), undefined, { sensitivity: "base", numeric: true });
    }
  };
  return [...jobs].sort((a, b) => compare(a, b) || byId(a, b));
}
