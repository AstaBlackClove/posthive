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
  locationId?: string;
  userTags?: string[];
  collaborators?: string[];
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
        locationId: content.locationId,
        userTags: content.userTags,
        collaborators: content.collaborators,
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
  const anyFailed = updated.some((t) =>
    t.status === "post_failed" || t.status === "comment_failed"
  );

  const finalStatus = allDone && !anyFailed ? "done" : anyFailed ? "failed" : "running";
  await prisma.postJob.update({ where: { id: job.id }, data: { status: finalStatus } });

  // Clean up stored media once the job is fully done (not dry-run, not failed)
  if (finalStatus === "done" && !job.dryRun && storage && content.mediaUrls?.length) {
    await Promise.allSettled(
      content.mediaUrls.map((url) => {
        console.log(`[storage] deleting ${url} after successful post`);
        return storage.delete(url);
      })
    );
  }
}

type EffectiveContent = {
  text: string;
  mediaUrls: string[];
  altTexts?: string[];
  mediaType?: "post" | "reel" | "story";
  youtubeType?: "short" | "video";
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

  if (!commentText || target.status !== "post_done") return;

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
