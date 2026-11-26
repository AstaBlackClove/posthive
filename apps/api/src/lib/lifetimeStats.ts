/**
 * Archives a published-post count into LifetimeStat before any delete that would
 * cascade off PostJobTarget rows — so /stats/public's lifetime total survives the
 * delete. Must be awaited before the delete, with the exact same where-filter the
 * delete itself uses (or a filter covering it), so the count matches what's about
 * to disappear.
 *
 * Every PostJobTarget-deleting path needs this: cleanupCron's 90-day prune, account
 * deletion, single/bulk post delete, and an edit that drops a platform from a post.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function archivePublishedCount(where: Prisma.PostJobTargetWhereInput): Promise<void> {
  const archivedCount = await prisma.postJobTarget.count({
    where: { ...where, status: { in: ["post_done", "comment_done"] } },
  });
  if (archivedCount === 0) return;
  await prisma.lifetimeStat.upsert({
    where: { id: 1 },
    create: { id: 1, postsPublished: archivedCount },
    update: { postsPublished: { increment: archivedCount } },
  });
}
