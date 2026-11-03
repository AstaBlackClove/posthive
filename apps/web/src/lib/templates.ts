import { normalizeCategory, type Category, type Pillar } from "./contentTypes";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Design template as returned by GET /templates (docs/content-types.md): the reference
// design for one content type. A post only takes its pillar and category, never its files.
export interface DesignTemplate {
  id: string;
  name: string;
  pillar: Pillar | null;
  category: Category;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  linkUrl: string | null;
  previewUrl: string | null;
  updatedAt?: string;
}

/** Storage URLs are relative when the API stores files on local disk. */
export function fileHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `${API_BASE}${url}`;
}

export function isFigmaLink(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "figma.com" || host.endsWith(".figma.com");
  } catch {
    return false;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Templates without a Figma link (migrated or old .fig-only ones) need one from the design team. */
export function isIncomplete(t: DesignTemplate): boolean {
  return !t.linkUrl;
}

/** Category → template. The API lists newest first, so the newest wins if a category has more than one. */
export function templatesByCategory(list: DesignTemplate[]): Map<Category, DesignTemplate> {
  const map = new Map<Category, DesignTemplate>();
  for (const t of list) {
    const category = normalizeCategory(t.category);
    if (category && !map.has(category)) map.set(category, t);
  }
  return map;
}
