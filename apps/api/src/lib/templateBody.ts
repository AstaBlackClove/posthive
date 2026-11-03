import { z } from "zod";
import { CATEGORIES, PILLARS, pillarFor } from "./contentTypes.js";
import { figmaLinkError } from "./figmaLink.js";

const urlPath = (url: string) => { try { return new URL(url, "http://x").pathname; } catch { return ""; } };

// Design template (docs/content-types.md): the reference design for one content type
// (Pillar + Category) — a Figma link plus an optional preview image.
// One per workspace and category. Posts only take the pillar/category, never the link.
// Old templates may still hold a .fig file (fileUrl/fileName/fileSize); it is kept
// in the database but can no longer be set through this body.
export const templateBody = z.object({
  pillar: z.enum(PILLARS).nullable(),
  category: z.enum(CATEGORIES),
  linkUrl: z.string({ required_error: "Add a Figma link." }).trim().max(2048),
  previewUrl: z.string().trim().min(1).max(2048).nullable().default(null),
}).superRefine((t, ctx) => {
  if (t.pillar !== pillarFor(t.category)) {
    const expected = pillarFor(t.category) ?? "no pillar";
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pillar"], message: `${t.category} belongs to ${expected}` });
  }
  const linkError = figmaLinkError(t.linkUrl);
  if (linkError) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["linkUrl"], message: linkError });
  if (t.previewUrl && !/\.(jpe?g|png|gif|webp)$/i.test(urlPath(t.previewUrl))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["previewUrl"], message: "The preview must be an image" });
  }
});

export type TemplateBody = z.infer<typeof templateBody>;
