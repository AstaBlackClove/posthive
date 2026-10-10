import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { withAuth, getUser, getWorkspaceId } from "../lib/auth/withAuth.js";

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {

  // GET /analytics — aggregated stats from DB cache (no live platform calls)
  app.get("/analytics", { preHandler: [withAuth] }, async (req, reply) => {
    void getUser(req); // auth verified via preHandler
    const workspaceId = getWorkspaceId(req);
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const jobs = await prisma.postJob.findMany({
      where: {
        workspaceId,
        scheduledFor: { gte: cutoff },
        targets: {
          some: {
            status: { in: ["done", "post_done", "comment_done"] },
            platformPostId: { not: null },
            stats: { isNot: null },
          },
        },
      },
      orderBy: { scheduledFor: "desc" },
      take: 500,
      select: {
        id: true,
        scheduledFor: true,
        content: true,
        targets: {
          where: {
            status: { in: ["done", "post_done", "comment_done"] },
            platformPostId: { not: null },
            stats: { isNot: null },
          },
          select: {
            id: true,
            account: { select: { platform: true, displayName: true } },
            stats: {
              select: { likes: true, reposts: true, replies: true, views: true, fetchedAt: true },
            },
          },
        },
      },
    });

    // Shape into groups
    const posts = jobs
      .filter((j) => j.targets.length > 0)
      .map((j) => {
        let text = "";
        try { text = (JSON.parse(j.content) as { text?: string }).text ?? ""; } catch { /* */ }
        return {
          jobId: j.id,
          scheduledFor: j.scheduledFor,
          text,
          targets: j.targets.map((t) => ({
            targetId: t.id,
            platform: t.account?.platform ?? "",
            displayName: t.account?.displayName ?? "",
            likes: t.stats!.likes,
            reposts: t.stats!.reposts,
            replies: t.stats!.replies,
            views: t.stats!.views ?? null,
            fetchedAt: t.stats!.fetchedAt,
          })),
        };
      });

    // Aggregate totals
    let totalLikes = 0, totalReposts = 0, totalReplies = 0, totalViews = 0;
    for (const p of posts) {
      for (const t of p.targets) {
        totalLikes += t.likes;
        totalReposts += t.reposts;
        totalReplies += t.replies;
        if (t.views != null) totalViews += t.views;
      }
    }

    return reply.send({
      totals: { likes: totalLikes, reposts: totalReposts, replies: totalReplies, views: totalViews, posts: posts.length },
      posts,
      lastSyncedAt: posts[0]?.targets[0]?.fetchedAt ?? null,
    });
  });
}
