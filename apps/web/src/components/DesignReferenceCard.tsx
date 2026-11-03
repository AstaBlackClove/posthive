"use client";

import type { Category } from "../lib/contentTypes";
import { fileHref, isFigmaLink, isIncomplete, type DesignTemplate } from "../lib/templates";
import { contentTypeLabel } from "./ContentTypeSelects";

// The design template for a post's content type, shown next to the post as a reference.
// Its link and preview are never attached to the post.
export function DesignReferenceCard({ template, category, showPreview = false }: {
  template: DesignTemplate | null | undefined;
  /** The post's category; with no template for it, a short note is shown instead. */
  category: Category | null;
  showPreview?: boolean;
}) {
  if (!category) return null;

  if (!template) {
    return (
      <p className="type-body-r-xs rounded-xl border border-dashed border-border px-3 py-2.5 text-muted">
        No design template for {category} yet. The design team adds them in Templates.
      </p>
    );
  }

  const preview = showPreview && template.previewUrl ? fileHref(template.previewUrl) : null;

  return (
    <div className="flex gap-3 rounded-xl border border-border bg-bg p-3">
      {preview && (
        <a href={preview} target="_blank" rel="noopener noreferrer" className="shrink-0" aria-label="Open the template preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-17.5 w-14 rounded-lg border border-border object-cover" />
        </a>
      )}
      <div className="flex-1 min-w-0">
        <p className="type-body-sb-xs text-fg">Design reference</p>
        <p className="type-body-r-xs mt-0.5 text-muted">
          {contentTypeLabel(template.category, template.pillar)}. For reference only; it is not attached to the post.
        </p>
        {isIncomplete(template) ? (
          <p className="type-body-r-xs mt-2 text-muted">Figma link not added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2 mt-2">
            {template.linkUrl && (
              <a href={template.linkUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border type-body-m-xs text-fg hover:bg-surface">
                {isFigmaLink(template.linkUrl) ? "Open in Figma" : "Open link"} <span aria-hidden>↗</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
