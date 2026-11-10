// What a person can do to a post from the Content List, as plain calls to the API. Moved here from the old
// Posts page as they were (same routes, same bodies); the page owns the toasts and the reloading.
import { apiFetch } from "./api";
import type { ContentType } from "../components/ContentTypeSelects";
import type { PerAccountOverride } from "../components/PlatformPreview";
import type { Job } from "./jobTypes";

/** The whole post, as the edit and review dialogs take it. */
export const fetchJob = (id: string) => apiFetch<Job>(`/jobs/${id}`);

/** Approve = schedule: the creator's requested time if it is still ahead, else five minutes from now. */
export function approveJob(job: Job): Promise<Job> {
  const requested = job.scheduledFor ? new Date(job.scheduledFor) : null;
  const when = requested && requested > new Date() ? requested.toISOString() : new Date(Date.now() + 5 * 60_000).toISOString();
  return apiFetch<Job>(`/jobs/${job.id}/schedule`, { method: "POST", body: JSON.stringify({ scheduledFor: when }) });
}

export const rejectJob = (job: Job, note: string) => apiFetch<Job>(`/jobs/${job.id}/reject`, { method: "POST", body: JSON.stringify({ note }) });

export const submitForReview = (id: string) => apiFetch<Job>(`/jobs/${id}/submit`, { method: "POST" });

export interface BulkSubmitResult {
  submitted: string[];
  skipped: { id: string; title: string; reason: string; missing?: string[] }[];
}

export const submitMany = (ids: string[]) => apiFetch<BulkSubmitResult>("/jobs/submit-bulk", { method: "POST", body: JSON.stringify({ ids }) });

export const retryFailed = (id: string) => apiFetch(`/jobs/${id}/retry-failed`, { method: "POST" });

export const deleteJob = (id: string) => apiFetch(`/jobs/${id}`, { method: "DELETE" });

/** One request for many; if it fails the posts are deleted one by one, so a partial success still counts. */
export async function deleteMany(ids: string[]): Promise<number> {
  try {
    const res = await apiFetch<{ deleted: number }>("/jobs/bulk", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    return res.deleted;
  } catch {
    let deleted = 0;
    for (const id of ids) {
      try {
        await apiFetch(`/jobs/${id}`, { method: "DELETE" });
        deleted++;
      } catch { /* the next one may still go */ }
    }
    return deleted;
  }
}

/**
 * Save the edit dialog's fields, then (for a draft) promote it: Marketing saves or sends for approval, the others
 * schedule it. The parameters are the dialog's own, in its order.
 */
export async function updateJob(
  jobId: string, text: string, commentText: string, scheduledFor: Date, mediaUrls: string[], accountIds: string[],
  perAccount: Record<string, PerAccountOverride>, mediaType: "post" | "reel" | "story" | undefined, youtubeType: "short" | "video" | undefined,
  youtubeVideoMode: "upload" | "url" | undefined, youtubeVideoUrl: string | undefined, isDraft: boolean | undefined, canSubmitOwn: boolean,
  youtubeThumbnailUrl?: string, pixelfedSensitive?: boolean, pixelfedVisibility?: "public" | "unlisted" | "private",
  youtubeVisibility?: "public" | "unlisted" | "private", youtubeTags?: string[], youtubeMadeForKids?: boolean,
  linkedinVisibility?: "PUBLIC" | "CONNECTIONS", blueskyContentWarning?: string, contentType?: ContentType, title?: string, send?: boolean,
): Promise<Job> {
  await apiFetch(`/jobs/${jobId}`, {
    method: "PATCH",
    body: JSON.stringify({
      text,
      ...(title !== undefined ? { title } : {}),
      commentText,
      // Drafts keep their date too: it is the requested post date
      scheduledFor: scheduledFor.toISOString(),
      mediaUrls,
      mediaType,
      // An imported draft can still have no account; the API requires at least one when sent
      ...(accountIds.length > 0 ? { accountIds } : {}),
      ...(youtubeType ? { youtubeType } : {}),
      ...(youtubeVideoMode ? { youtubeVideoMode } : {}),
      ...(youtubeVideoUrl !== undefined ? { youtubeVideoUrl } : {}),
      ...(youtubeThumbnailUrl !== undefined ? { youtubeThumbnailUrl } : {}),
      ...(pixelfedSensitive !== undefined ? { pixelfedSensitive } : {}),
      ...(pixelfedVisibility !== undefined ? { pixelfedVisibility } : {}),
      ...(youtubeVisibility !== undefined ? { youtubeVisibility } : {}),
      ...(youtubeTags !== undefined ? { youtubeTags } : {}),
      ...(youtubeMadeForKids !== undefined ? { youtubeMadeForKids } : {}),
      ...(linkedinVisibility !== undefined ? { linkedinVisibility } : {}),
      ...(blueskyContentWarning !== undefined ? { blueskyContentWarning } : {}),
      ...(contentType ? { pillar: contentType.pillar, category: contentType.category } : {}),
      perAccount: Object.keys(perAccount).length > 0 ? perAccount : {},
    }),
  });
  if (isDraft) {
    if (canSubmitOwn) {
      if (send) await apiFetch(`/jobs/${jobId}/submit`, { method: "POST" });
    } else {
      await apiFetch(`/jobs/${jobId}/schedule`, { method: "POST", body: JSON.stringify({ scheduledFor: scheduledFor.toISOString() }) });
    }
  }
  return fetchJob(jobId);
}

/** The toast after a save, by what was saved. */
export function savedMessage(isDraft: boolean, canSubmitOwn: boolean, send?: boolean): string {
  return isDraft ? (canSubmitOwn ? (send ? "Sent for design review." : "Draft saved.") : "Draft scheduled!") : "Post updated.";
}
