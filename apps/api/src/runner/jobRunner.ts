/**
 * Job runner — processes a single PostJob end-to-end.
 *
 * State machine per PostJobTarget:
 *   pending → (createPost) → post_done → (createComment?) → comment_done
 *                         ↘ post_failed
 *                                       ↘ comment_failed
 *
 * The runner is crash-safe: it persists platformPostId + replyContext and
 * advances the target to post_done *before* attempting the comment step.
 * On a crash-resume, a target already at post_done skips straight to
 * createComment — no duplicate posts.
 */

import type { PostJob, PostJobTarget, Account } from "@prisma/client";
import { getAdapter } from "../adapters/index.js";
import { prisma } from "../lib/prisma.js";

const MAX_ATTEMPTS = 3;

// Full type including relations loaded by the runner
type FullTarget = PostJobTarget & { account: Account };
type JobContent = { text: string; mediaUrls: string[] };

export async function runJob(job: PostJob & { targets: FullTarget[] }): Promise<void> {
  // Mark job as running
  await prisma.postJob.update({
    where: { id: job.id },
    data: { status: "running" },
  });

  const content: JobContent = JSON.parse(job.content);

  // Process all targets concurrently. One target failing doesn't cancel others.
  await Promise.allSettled(job.targets.map((target) => runTarget(target, content, job.commentText)));

  // After all targets finish, set the aggregate job status.
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

  await prisma.postJob.update({
    where: { id: job.id },
    data: { status: allDone && !anyFailed ? "done" : anyFailed ? "failed" : "running" },
  });
}

async function runTarget(
  target: FullTarget,
  content: JobContent,
  commentText: string | null
): Promise<void> {
  const adapter = getAdapter(target.account.platform);

  // Step 1: create post (skip if already done — crash-resume path)
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
      refreshedAccount = await adapter.refreshTokenIfNeeded(target.account);
    } catch (err) {
      await setTargetStatus(target.id, "post_failed", { error: String(err) });
      return;
    }

    let postResult: Awaited<ReturnType<typeof adapter.createPost>>;
    try {
      postResult = await adapter.createPost(refreshedAccount, content);
    } catch (err) {
      await setTargetStatus(target.id, "post_failed", { error: String(err) });
      return;
    }

    // Persist the post result immediately before attempting the comment.
    // If the process crashes here, on resume we pick up from post_done.
    await prisma.postJobTarget.update({
      where: { id: target.id },
      data: {
        status: "post_done",
        platformPostId: postResult.platformPostId,
        replyContext: JSON.stringify(postResult.replyContext),
        error: null,
      },
    });

    // Reload so we have the latest state for the comment step
    target = { ...target, status: "post_done", replyContext: JSON.stringify(postResult.replyContext) };
  }

  // Step 2: create comment (only if the job has commentText)
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
    refreshedAccount = await adapter.refreshTokenIfNeeded(target.account);
  } catch (err) {
    await setTargetStatus(target.id, "comment_failed", { error: String(err) });
    return;
  }

  try {
    await adapter.createComment(refreshedAccount, replyContext, commentText);
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
