import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { withAuth, withAuthOrToken, getUser, getWorkspaceId, requireTemplateManagerRole } from "../lib/auth/withAuth.js";
import { pillarFor } from "../lib/contentTypes.js";
import type { StorageAdapter } from "../lib/storage.js";
import { TEMPLATE_SELECT, withoutTemplateMedia } from "../lib/templates.js";
import { templateBody, type TemplateBody } from "../lib/templateBody.js";

function templateData(t: TemplateBody) {
  return {
    name: t.category,
    category: t.category,
    // Pillar is derived, never trusted from the client
    pillar: pillarFor(t.category),
    linkUrl: t.linkUrl,
    previewUrl: t.previewUrl,
  };
}

const previewsOf = (t: { previewUrl: string | null }) => (t.previewUrl ? [t.previewUrl] : []);

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

const duplicate = (category: string) => ({ error: `A template for ${category} already exists. Edit that template instead.` });

export async function templateRoutes(
  app: FastifyInstance,
  { storage }: { storage: StorageAdapter },
): Promise<void> {

  // Files the caller just uploaded may be attached; anything else (another user's or
  // another workspace's file) may not — deleting the template would delete that file.
  async function ownsUploads(urls: string[], userId: string): Promise<boolean> {
    if (!urls.length) return true;
    const owned = await prisma.upload.count({ where: { url: { in: urls }, userId } });
    return owned === new Set(urls).size;
  }

  // Uploads unclaimed for 24h are deleted by the orphan cron (index.ts) — claim template files.
  async function claimUploads(urls: string[]): Promise<void> {
    if (urls.length) await prisma.upload.updateMany({ where: { url: { in: urls } }, data: { claimedAt: new Date() } });
  }

  // Remove files a template no longer uses. Legacy kit files stay (posts share them).
  async function removeFiles(urls: string[]): Promise<void> {
    const free = await withoutTemplateMedia(urls);
    if (!free.length) return;
    await Promise.allSettled(free.map((url) => storage.delete(url)));
    await prisma.upload.deleteMany({ where: { url: { in: free } } });
  }

  // List the workspace's design templates (every role can view). Rows without a
  // category are legacy caption templates, removed by the cleanup migration.
  app.get("/templates", { preHandler: [withAuthOrToken] }, async (req, reply) => {
    const workspaceId = getWorkspaceId(req);
    const templates = await prisma.template.findMany({
      where: { workspaceId, category: { not: null } },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: TEMPLATE_SELECT,
    });
    return reply.send({ templates });
  });

  // Create a template — design team only (docs/role-access-matrix.md US-07)
  app.post("/templates", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);

    const forbidden = await requireTemplateManagerRole(userId, workspaceId);
    if (forbidden) return reply.status(403).send(forbidden);

    const parsed = templateBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid template" });
    const body = parsed.data;

    const existing = await prisma.template.findFirst({ where: { workspaceId, category: body.category }, select: { id: true } });
    if (existing) return reply.status(409).send(duplicate(body.category));

    const files = previewsOf(body);
    if (!(await ownsUploads(files, userId))) return reply.status(400).send({ error: "Upload the preview image again." });

    try {
      const template = await prisma.template.create({
        data: { userId, workspaceId, ...templateData(body) },
        select: TEMPLATE_SELECT,
      });
      await claimUploads(files);
      return reply.status(201).send({ template });
    } catch (err) {
      if (isUniqueViolation(err)) return reply.status(409).send(duplicate(body.category));
      throw err;
    }
  });

  // Replace a template (content type, link, preview); — design team only
  app.patch("/templates/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };

    const forbidden = await requireTemplateManagerRole(userId, workspaceId);
    if (forbidden) return reply.status(403).send(forbidden);

    const parsed = templateBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid template" });
    const body = parsed.data;

    const current = await prisma.template.findFirst({
      where: { id, workspaceId },
      select: { id: true, category: true, previewUrl: true },
    });
    if (!current) return reply.status(404).send({ error: "Not found" });

    // Only a category change can create a duplicate (legacy duplicates are cleaned up separately)
    if (body.category !== current.category) {
      const clash = await prisma.template.findFirst({
        where: { workspaceId, category: body.category, id: { not: id } },
        select: { id: true },
      });
      if (clash) return reply.status(409).send(duplicate(body.category));
    }

    const kept = new Set(previewsOf(current));
    const added = previewsOf(body).filter((url) => !kept.has(url));
    if (!(await ownsUploads(added, userId))) return reply.status(400).send({ error: "Upload the preview image again." });

    let template;
    try {
      template = await prisma.template.update({ where: { id }, data: templateData(body), select: TEMPLATE_SELECT });
    } catch (err) {
      if (isUniqueViolation(err)) return reply.status(409).send(duplicate(body.category));
      throw err;
    }
    await claimUploads(added);
    const next = new Set(previewsOf(body));
    await removeFiles(previewsOf(current).filter((url) => !next.has(url)));
    return reply.send({ template });
  });

  // Delete a template and its files — design team only. Posts never reference
  // design template files; legacy kit files stay protected (withoutTemplateMedia).
  app.delete("/templates/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };

    const forbidden = await requireTemplateManagerRole(userId, workspaceId);
    if (forbidden) return reply.status(403).send(forbidden);

    const template = await prisma.template.findFirst({
      where: { id, workspaceId },
      select: { id: true, previewUrl: true },
    });
    if (!template) return reply.status(404).send({ error: "Not found" });

    await prisma.template.delete({ where: { id } });
    await removeFiles(previewsOf(template));
    return reply.send({ ok: true });
  });
}
