"use client";

import type { Category } from "../lib/contentTypes";
import { fileHref, formatBytes, isFigmaLink, isIncomplete, type DesignTemplate } from "../lib/templates";
import { contentTypeLabel } from "./ContentTypeSelects";

const linkStyle = { border: "1px solid #2a2a2a", color: "#ededed" } as const;

// The design template for a post's content type, shown next to the post as a reference.
// Its file and link are never attached to the post.
export function DesignReferenceCard({ template, category, showPreview = false }: {
  template: DesignTemplate | null | undefined;
  /** The post's category; with no template for it, a short note is shown instead. */
  category: Category | null;
  showPreview?: boolean;
}) {
  if (!category) return null;

  if (!template) {
    return (
      <p className="text-xs rounded-xl px-3 py-2.5" style={{ color: "#888", border: "1px dashed #2a2a2a" }}>
        No design template for {category} yet. The design team adds them in Templates.
      </p>
    );
  }

  const preview = showPreview && template.previewUrl ? fileHref(template.previewUrl) : null;

  return (
    <div className="flex gap-3 rounded-xl p-3" style={{ border: "1px solid #2a2a2a", background: "#0a0a0a" }}>
      {preview && (
        <a href={preview} target="_blank" rel="noopener noreferrer" className="shrink-0" aria-label="Open the template preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="rounded-lg object-cover" style={{ width: 56, height: 70, border: "1px solid #2a2a2a" }} />
        </a>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold" style={{ color: "#ededed" }}>Design reference</p>
        <p className="text-xs mt-0.5" style={{ color: "#888" }}>
          {contentTypeLabel(template.category, template.pillar)}. For reference only; it is not attached to the post.
        </p>
        {isIncomplete(template) ? (
          <p className="text-xs mt-2" style={{ color: "#888" }}>Design file not available yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2 mt-2">
            {template.linkUrl && (
              <a href={template.linkUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-white/5" style={linkStyle}>
                {isFigmaLink(template.linkUrl) ? "Open in Figma" : "Open link"} <span aria-hidden>↗</span>
              </a>
            )}
            {template.fileUrl && (
              <a href={fileHref(template.fileUrl)} download={template.fileName ?? undefined}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-white/5" style={linkStyle}>
                Download file
                {template.fileSize ? <span style={{ color: "#888" }}>{formatBytes(template.fileSize)}</span> : null}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
