import { prisma } from "./prisma.js";

// Design templates (docs/content-types.md): the reference design for one content type
// (Pillar + Category). Posts never copy template files; they only carry pillar/category.

export const TEMPLATE_SELECT = {
  id: true,
  name: true,
  pillar: true,
  category: true,
  linkUrl: true,
  previewUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Drops URLs still used by a design template or by a legacy template kit. Posts made
 * from a legacy kit share its design files, so post cleanup (delete, edit, after
 * publish, failed-job cleanup) must never remove them.
 */
export async function withoutTemplateMedia(urls: string[]): Promise<string[]> {
  if (!urls.length) return urls;
  const [templates, legacy] = await Promise.all([
    prisma.template.findMany({
      where: { previewUrl: { in: urls } },
      select: { previewUrl: true },
    }),
    prisma.legacyTemplateMedia.findMany({ where: { url: { in: urls } }, select: { url: true } }),
  ]);
  const inUse = new Set(legacy.map((l) => l.url));
  for (const t of templates) {
    if (t.previewUrl) inUse.add(t.previewUrl);
  }
  return urls.filter((url) => !inUse.has(url));
}

/** Storage URLs are relative for local disk; API clients need absolute ones. */
export function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = (process.env.PUBLIC_API_URL ?? process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`).replace(/\/$/, "");
  return `${base}${url}`;
}

type TemplateFiles = {
  linkUrl: string | null;
  previewUrl: string | null;
};

/** The design reference returned by the public API and MCP (absolute URLs). */
export function designReference(t: TemplateFiles) {
  return {
    linkUrl: t.linkUrl,
    previewUrl: t.previewUrl ? absoluteUrl(t.previewUrl) : null,
  };
}
