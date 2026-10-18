/**
 * Job runner — processes a single PostJob end-to-end.
 *
 * State machine per PostJobTarget:
 *   pending → (createPost) → post_done → (createComment?) → comment_done
 *                         ↘ post_failed
 *                                       ↘ comment_failed
 *
 * Dry-run mode (PostJob.dryRun = true):
 *   Skips all real platform API calls. Simulates success with fake IDs.
 *   Everything else runs for real — BullMQ, DB state machine, retries.
 *   Use this to verify the full scheduling flow without posting anything.
 */

import * as Sentry from "@sentry/node";
import type { PostJob, PostJobTarget, Account } from "@prisma/client";
import { getAdapter } from "../adapters/index.js";
import { prisma } from "../lib/prisma.js";
import { schedulePostJob } from "../lib/queue.js";
import { isSsrfBlocked } from "../lib/ssrf.js";
import { sendPostFailedEmail } from "../lib/mailer.js";
import type { PostResult, CommentResult } from "../adapters/types.js";
import type { StorageAdapter } from "../lib/storage.js";

const MAX_ATTEMPTS = 3;

type FullTarget = PostJobTarget & { account: Account };
type PerAccountOverride = { text?: string; commentText?: string };
type JobContent = {
  text: string;
  mediaUrls?: string[];
  altTexts?: string[];
  mediaType?: "post" | "reel" | "story";
  youtubeType?: "short" | "video";
  youtubeVideoUrl?: string;
  youtubeThumbnailUrl?: string;
  youtubeVisibility?: "public" | "unlisted" | "private";
  youtubeTags?: string[];
  youtubeMadeForKids?: boolean;
  locationId?: string;
  userTags?: string[];
  collaborators?: string[];
  pixelfedSensitive?: boolean;
  pixelfedVisibility?: "public" | "unlisted" | "private";
  linkedinVisibility?: "PUBLIC" | "CONNECTIONS";
  blueskyLanguage?: string;
  blueskyContentWarning?: string;
  perAccount?: Record<string, PerAccountOverride>;
};

// Simulated results returned in dry-run mode
function dryRunPostResult(platform: string): PostResult {
  const fakeId = `dry-run:${platform}:${Date.now()}`;
  return {
    platformPostId: fakeId,
    replyContext: { uri: fakeId, cid: "dry-run-cid" },
  };
}

function dryRunCommentResult(platform: string): CommentResult {
  return { platformCommentId: `dry-run:comment:${platform}:${Date.now()}` };
}

export async function runJob(
  job: PostJob & { targets: FullTarget[] },
  storage?: StorageAdapter
): Promise<void> {
  await prisma.postJob.update({
    where: { id: job.id },
    data: { status: "running" },
  });

  if (job.dryRun) {
    console.log(`[runner] DRY RUN — job ${job.id} — no real API calls will be made`);
  }

  // Block execution if workspace subscription is on hold or cancelled
  if (job.workspaceId) {
    const ws = await prisma.workspace.findUnique({
      where: { id: job.workspaceId },
      select: { planStatus: true },
    });
    if (ws?.planStatus === "on_hold" || ws?.planStatus === "cancelled") {
      await prisma.postJobTarget.updateMany({
        where: { postJobId: job.id },
        data: { status: "post_failed", error: `Subscription ${ws.planStatus} — post skipped` },
      });
      await prisma.postJob.update({ where: { id: job.id }, data: { status: "failed" } });
      console.warn(`[runner] job ${job.id} skipped — workspace ${job.workspaceId} planStatus=${ws.planStatus}`);
      return;
    }
  }

  const content: JobContent = JSON.parse(job.content);

  await Promise.allSettled(
    job.targets.map((target) => {
      const override = content.perAccount?.[target.accountId];
      const effectiveContent = {
        text: override?.text ?? content.text,
        mediaUrls: content.mediaUrls ?? [],
        altTexts: content.altTexts,
        mediaType: content.mediaType,
        youtubeType: content.youtubeType,
        youtubeVideoUrl: content.youtubeVideoUrl,
        youtubeThumbnailUrl: content.youtubeThumbnailUrl,
        youtubeVisibility: content.youtubeVisibility,
        youtubeTags: content.youtubeTags,
        youtubeMadeForKids: content.youtubeMadeForKids,
        locationId: content.locationId,
        userTags: content.userTags,
        collaborators: content.collaborators,
        pixelfedSensitive: content.pixelfedSensitive,
        pixelfedVisibility: content.pixelfedVisibility,
        linkedinVisibility: content.linkedinVisibility,
        blueskyLanguage: content.blueskyLanguage,
        blueskyContentWarning: content.blueskyContentWarning,
      };
      const effectiveComment = override?.commentText !== undefined ? override.commentText : job.commentText;
      return runTarget(target, effectiveContent, effectiveComment, job.dryRun);
    })
  );

  const updated = await prisma.postJobTarget.findMany({
    where: { postJobId: job.id },
    select: { status: true },
  });

  const allDone = updated.every((t) =>
    t.status === "comment_done" || t.status === "post_done"
  );
  const anyPostFailed = updated.some((t) => t.status === "post_failed");
  const anyCommentFailed = updated.some((t) => t.status === "comment_failed");
  const anyFailed = anyPostFailed || anyCommentFailed;

  const finalStatus = allDone && !anyFailed ? "done" : anyFailed ? "failed" : "running";
  await prisma.postJob.update({ where: { id: job.id }, data: { status: finalStatus } });

  // Spawn next repeat occurrence when this job succeeds
  if (finalStatus === "done" && !job.dryRun) {
    const fullJob = await prisma.postJob.findUnique({
      where: { id: job.id },
      select: { repeatInterval: true, repeatEndsAt: true, repeatParentId: true, scheduledFor: true,
                content: true, commentText: true, userId: true, workspaceId: true,
                targets: { select: { accountId: true } } },
    });
    if (fullJob?.repeatInterval && fullJob.scheduledFor) {
      const next = new Date(fullJob.scheduledFor);
      if (fullJob.repeatInterval === "daily")   next.setDate(next.getDate() + 1);
      if (fullJob.repeatInterval === "weekly")  next.setDate(next.getDate() + 7);
      if (fullJob.repeatInterval === "monthly") next.setMonth(next.getMonth() + 1);

      const endsAt = fullJob.repeatEndsAt;
      if (!endsAt || next <= endsAt) {
        const parentId = fullJob.repeatParentId ?? job.id; // flat chain — always point to root
        const nextJob = await prisma.postJob.create({
          data: {
            scheduledFor: next,
            status: "pending",
            content: fullJob.content,
            commentText: fullJob.commentText,
            userId: fullJob.userId,
            workspaceId: fullJob.workspaceId,
            repeatInterval: fullJob.repeatInterval,
            repeatEndsAt: endsAt,
            repeatParentId: parentId,
            targets: { create: fullJob.targets.map(t => ({ accountId: t.accountId })) },
          },
        });
        await schedulePostJob(nextJob.id, next);
        console.log(`[runner] spawned repeat job ${nextJob.id} (${fullJob.repeatInterval}) for ${next.toISOString()}`);
      }
    }
  }

  // Sync LibraryItem status if this job was drip-scheduled
  if (finalStatus === "done" || finalStatus === "failed") {
    await prisma.libraryItem.updateMany({
      where: { scheduledJobId: job.id },
      data: {
        status: finalStatus === "done" ? "published" : "failed",
        publishedAt: finalStatus === "done" ? new Date().toISOString() : undefined,
        errorMessage: finalStatus === "failed" ? "One or more platforms failed" : undefined,
      },
    });
  }

  // Send failure email for non-library, non-dryRun failed jobs
  if (finalStatus === "failed" && !job.dryRun) {
    const isLibraryJob = await prisma.libraryItem.count({ where: { scheduledJobId: job.id } }) > 0;
    if (!isLibraryJob) {
      const user = await prisma.user.findUnique({
        where: { id: job.userId },
        select: { email: true },
      });
      if (user?.email && job.scheduledFor) {
        const platforms = job.targets
          .filter(t => t.status === "post_failed" || t.status === "comment_failed")
          .map(t => t.account.platform);
        sendPostFailedEmail(user.email, platforms, job.scheduledFor, job.id).catch((err) => {
          console.warn(`[runner] failed to send failure email for job ${job.id}:`, err.message);
        });
      }
    }
  }

  // Fire outbound webhook (silent fail — never affects job status)
  if (!job.dryRun) {
    const wsRow = job.workspaceId
      ? await prisma.workspace.findUnique({ where: { id: job.workspaceId }, select: { webhookUrl: true } })
      : null;
    if (wsRow?.webhookUrl && !isSsrfBlocked(wsRow.webhookUrl)) {
      const platforms = job.targets.map(t => t.account.platform);
      fetch(wsRow.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "post.published",
          postId: job.id,
          status: finalStatus,
          scheduledFor: job.scheduledFor,
          platforms,
          text: content.text,
        }),
        signal: AbortSignal.timeout(10_000),
      }).catch((err) => {
        console.warn(`[runner] webhook delivery failed for job ${job.id}:`, err.message);
      });
    }
  }

  // Clean up stored media if all posts succeeded (even if first comment failed)
  const postingSucceeded = !anyPostFailed;
  if (postingSucceeded && !job.dryRun && storage) {
    const urlsToClean = [
      ...(content.mediaUrls ?? []),
      ...(content.youtubeThumbnailUrl ? [content.youtubeThumbnailUrl] : []),
    ];
    const ownedUrls = urlsToClean.filter((url) => storage.ownsUrl(url));
    if (ownedUrls.length) {
      await Promise.allSettled(
        ownedUrls.map((url) => {
          console.log(`[storage] deleting ${url} after successful post`);
          return storage.delete(url);
        })
      );
      await prisma.upload.deleteMany({ where: { url: { in: ownedUrls } } });
    }
  }
}

type EffectiveContent = {
  text: string;
  mediaUrls: string[];
  altTexts?: string[];
  mediaType?: "post" | "reel" | "story";
  youtubeType?: "short" | "video";
  youtubeVideoUrl?: string;
  youtubeThumbnailUrl?: string;
  youtubeVisibility?: "public" | "unlisted" | "private";
  youtubeTags?: string[];
  youtubeMadeForKids?: boolean;
  linkedinVisibility?: "PUBLIC" | "CONNECTIONS";
  blueskyLanguage?: string;
  blueskyContentWarning?: string;
};

async function runTarget(
  target: FullTarget,
  content: EffectiveContent,
  commentText: string | null,
  dryRun: boolean
): Promise<void> {
  const adapter = getAdapter(target.account.platform);

  if (target.status === "pending") {
    if (target.attempts >= MAX_ATTEMPTS) {
      await setTargetStatus(target.id, "post_failed", { error: "Max attempts reached" });
      return;
    }

    await prisma.postJobTarget.update({
      where: { id: target.id },
      data: { attempts: { increment: 1 } },
    });

    let refreshedAccount: Account;
    try {
      refreshedAccount = dryRun
        ? target.account
        : await adapter.refreshTokenIfNeeded(target.account);
    } catch (err) {
      await setTargetStatus(target.id, "post_failed", { error: String(err) });
      return;
    }

    let postResult: PostResult;
    try {
      postResult = dryRun
        ? dryRunPostResult(target.account.platform)
        : await adapter.createPost(refreshedAccount, content);
    } catch (err) {
      console.error(`[runner] createPost failed for ${target.account.platform} (account ${target.accountId}):`, err);
      Sentry.captureException(err, {
        tags: { component: "runner", platform: target.account.platform },
        extra: { postJobId: target.postJobId, accountId: target.accountId },
      });
      await setTargetStatus(target.id, "post_failed", { error: String(err) });
      return;
    }

    await prisma.postJobTarget.update({
      where: { id: target.id },
      data: {
        status: "post_done",
        platformPostId: postResult.platformPostId,
        replyContext: JSON.stringify(postResult.replyContext),
        error: null,
      },
    });

    target = { ...target, status: "post_done", replyContext: JSON.stringify(postResult.replyContext) };
  }

  // Platforms that don't support first comments
  const NO_COMMENT_PLATFORMS = new Set(["pinterest", "telegram", "tumblr", "linkedin", "tiktok"]);
  if (!commentText || target.status !== "post_done" || NO_COMMENT_PLATFORMS.has(target.account.platform)) return;

  // YouTube private videos don't accept API comments
  if (target.account.platform === "youtube" && content.youtubeVisibility === "private") return;

  const replyContext = target.replyContext ? JSON.parse(target.replyContext) : null;
  if (!replyContext) {
    await setTargetStatus(target.id, "comment_failed", {
      error: "post_done but replyContext is missing — cannot comment",
    });
    return;
  }

  let refreshedAccount: Account;
  try {
    refreshedAccount = dryRun
      ? target.account
      : await adapter.refreshTokenIfNeeded(target.account);
  } catch (err) {
    await setTargetStatus(target.id, "comment_failed", { error: String(err) });
    return;
  }

  try {
    if (!dryRun) {
      await adapter.createComment(refreshedAccount, replyContext, commentText);
    } else {
      dryRunCommentResult(target.account.platform); // simulated — no API call
    }
    await setTargetStatus(target.id, "comment_done", {});
  } catch (err) {
    Sentry.captureException(err, {
      tags: { component: "runner", platform: target.account.platform, step: "createComment" },
      extra: { postJobId: target.postJobId, accountId: target.accountId },
    });
    await setTargetStatus(target.id, "comment_failed", { error: String(err) });
  }
}

async function setTargetStatus(
  id: string,
  status: string,
  extra: { error?: string }
): Promise<void> {
  await prisma.postJobTarget.update({
    where: { id },
    data: { status, error: extra.error ?? null },
  });
}
