import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { getUser, getWorkspaceId, getWorkspaceRole, isDraftVisibleTo, jobVisibilityWhere, withAuth } from "../lib/auth/withAuth.js";
import { bucketJobCounts, jobFilterWhere, type JobCounts } from "../lib/jobFilters.js";
import { contentOf } from "../lib/dashboardData.js";
import {
  LIST_PAGE_MAX,
  LIST_PAGE_SIZE,
  importMarker,
  importSourceOf,
  toDetail,
  toListItem,
  type ImportSource,
} from "../lib/contentList.js";

const LIST_SELECT = {
  id: true,
  status: true,
  approvalStatus: true,
  scheduledFor: true,
  content: true,
  targets: { select: { account: { select: { platform: true } } } },
} satisfies Prisma.PostJobSelect;

const DETAIL_SELECT = {
  id: true,
  status: true,
  approvalStatus: true,
  scheduledFor: true,
  content: true,
  commentText: true,
  createdAt: true,
  userId: true,
  reviewNote: true,
  reviewedAt: true,
  reviewedBy: { select: { name: true } },
  user: { select: { name: true } },
  targets: { select: { status: true, error: true, account: { select: { platform: true, displayName: true } } } },
} satisfies Prisma.PostJobSelect;

/** The newest plan file imported into the workspace, and how many posts came in with it. */
async function latestImport(base: Prisma.PostJobWhereInput): Promise<ImportSource | null> {
  const newest = await prisma.postJob.findFirst({
    where: { AND: [base, { importKey: { not: null } }] },
    orderBy: { createdAt: "desc" },
    select: { content: true, user: { select: { name: true } } },
  });
  const source = newest ? importSourceOf(contentOf(newest.content)) : null;
  if (!newest || !source) return null;
  // the posts of that import: the substring is the import's own timestamp, on rows that have an import key
  const count = await prisma.postJob.count({
    where: { AND: [base, { importKey: { not: null } }, { content: { contains: importMarker(source.importedAt) } }] },
  });
  return { ...source, importedBy: newest.user?.name ?? null, count };
}

export async function jobsListRoutes(app: FastifyInstance): Promise<void> {
  // One page of the Content List: the rows of a status filter, soonest first (drafts with no date last), with the
  // count of every filter. The role decides which drafts are visible (the Posts page's rule), so a count here is
  // a count there. `source=1` also answers which plan file the newest import came from: the page asks once, not on
  // every page turn.
  app.get(
    "/jobs/list",
    { preHandler: [withAuth], config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const { id: userId } = getUser(req);
      const workspaceId = getWorkspaceId(req);
      const query = req.query as { filter?: string; page?: string; limit?: string; source?: string };

      const filter = query.filter ?? "all";
      const filterWhere = filter === "all" ? null : jobFilterWhere(filter);
      if (filter !== "all" && !filterWhere) {
        return reply.status(400).send({ error: "Unknown filter.", code: "INVALID_FILTER" });
      }
      const size = Math.min(Math.max(Math.trunc(Number(query.limit)) || LIST_PAGE_SIZE, 1), LIST_PAGE_MAX);

      const role = await getWorkspaceRole(userId, workspaceId);
      const base: Prisma.PostJobWhereInput = { workspaceId, AND: [jobVisibilityWhere(role, userId)] };

      const groups = await prisma.postJob.groupBy({ by: ["status", "approvalStatus"], where: base, _count: true });
      const counts = bucketJobCounts(groups);
      const total = filter === "all" ? counts.all : counts[filter as keyof JobCounts];
      const pageCount = Math.max(1, Math.ceil(total / size));
      const page = Math.min(Math.max(Math.trunc(Number(query.page)) || 1, 1), pageCount);

      const [rows, source] = await Promise.all([
        prisma.postJob.findMany({
          where: filterWhere ? { AND: [base, filterWhere] } : base,
          orderBy: [{ scheduledFor: { sort: "asc", nulls: "last" } }, { id: "asc" }],
          skip: (page - 1) * size,
          take: size,
          select: LIST_SELECT,
        }),
        query.source === "1" ? latestImport(base) : Promise.resolve(undefined),
      ]);

      return reply.send({
        items: rows.map(toListItem),
        total,
        page,
        pageSize: size,
        pageCount,
        counts,
        ...(source !== undefined ? { source } : {}),
      });
    },
  );

  // One post for the drawer. A draft the role may not see answers 404, as GET /jobs/:id does: no probing by id.
  app.get(
    "/jobs/:id/detail",
    { preHandler: [withAuth], config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const { id: userId } = getUser(req);
      const workspaceId = getWorkspaceId(req);
      const { id } = req.params as { id: string };

      const role = await getWorkspaceRole(userId, workspaceId);
      const job = await prisma.postJob.findFirst({ where: { id, workspaceId }, select: DETAIL_SELECT });
      if (!job || !isDraftVisibleTo(role, userId, job)) return reply.status(404).send({ error: "Job not found" });
      // `mine`: the server lets a person delete or retry only their own post (an admin any), so the drawer offers those
      // only on posts that are theirs. Editing and submitting a draft is open to the team: it is not about who made it.
      return reply.send({ ...toDetail(job), mine: job.userId === userId });
    },
  );
}
