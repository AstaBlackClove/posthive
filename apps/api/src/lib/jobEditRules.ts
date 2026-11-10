// Who may edit a post, and when an edit sends it back out of design review.
// Pure so the rules are testable without the database.

export interface EditableJobState {
  status: string;
  approvalStatus: string | null;
}

export type EditCheck = { ok: true } | { ok: false; status: 403 | 409; error: string; code?: string };

const MANAGE = new Set(["owner", "admin", "designer"]);

/**
 * Admin/owner: any draft or scheduled post.
 * Marketing (member): any draft, whoever made it, and only before approval — draft, in review or rejected. A quarter
 * plan is imported by one person and kept by the team, so a draft belongs to the workspace, not to its uploader.
 * Design team and unknown roles: never.
 */
export function canEditJob(role: string | null | undefined, job: EditableJobState): EditCheck {
  if (job.status !== "pending" && job.status !== "draft") {
    return { ok: false, status: 409, error: `Cannot edit a job with status "${job.status}"` };
  }
  if (role !== "owner" && role !== "admin" && role !== "member") {
    return { ok: false, status: 403, error: "Your role cannot edit content.", code: "FORBIDDEN" };
  }
  if (role === "member" && job.status === "pending") {
    return { ok: false, status: 403, error: "Approved posts are locked. Ask an admin to change them.", code: "FORBIDDEN" };
  }
  return { ok: true };
}

// Drops empty values and sorts keys, so `perAccount: {}` or `mediaUrls: []` that the
// edit form always sends does not count as a change against content that omits them.
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const v = canonical((value as Record<string, unknown>)[key]);
      const empty = v === undefined || v === null || v === "" ||
        (Array.isArray(v) && v.length === 0) ||
        (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0);
      if (!empty) out[key] = v;
    }
    return out;
  }
  return value;
}

/** True when two content JSON strings carry the same meaningful values. */
export function sameContent(a: string, b: string): boolean {
  try {
    return JSON.stringify(canonical(JSON.parse(a))) === JSON.stringify(canonical(JSON.parse(b)));
  } catch {
    return a === b;
  }
}

/**
 * Changing content (title, caption, media, accounts, type) pulls a submitted or rejected draft
 * back to a plain draft, so it must be re-sent. A date-only change never does.
 * Manage roles edit without resetting the review.
 */
export function shouldResetReview(role: string | null | undefined, job: EditableJobState, contentChanged: boolean): boolean {
  if (!contentChanged) return false;
  if (role && MANAGE.has(role)) return false;
  return job.status === "draft" && (job.approvalStatus === "pending" || job.approvalStatus === "rejected");
}
