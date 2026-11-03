"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api";
import { cn } from "../lib/cn";
import type { Category } from "../lib/contentTypes";
import { figmaLinkError } from "../lib/figmaLink";
import { fileHref, type DesignTemplate } from "../lib/templates";
import { ContentTypeSelects, type ContentType } from "./ContentTypeSelects";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif";

interface UploadedFile {
  url: string;
  /** Uploaded in this editor session and not saved yet — safe to delete from storage. */
  fresh: boolean;
}

function discardUpload(url: string) {
  fetch(`${API_BASE}/upload`, { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }).catch(() => {});
}

// Design team only: the reference design for one content type (Pillar + Category) —
// a Figma link, plus an optional preview image. Marketing sees it
// as a reference in Compose; nothing here is ever copied into a post.
export function TemplateEditor({ template, presetCategory, takenCategories, onClose, onSaved }: {
  template: DesignTemplate | null; // null = new template
  presetCategory?: Category | null;
  /** Categories that already have a template (one per category). */
  takenCategories: Set<Category>;
  onClose: () => void;
  onSaved: (template: DesignTemplate) => void;
}) {
  const initialCategory = template?.category ?? presetCategory ?? null;
  const [type, setType] = useState<ContentType>({ pillar: template?.pillar ?? null, category: initialCategory });
  const [linkUrl, setLinkUrl] = useState(template?.linkUrl ?? "");
  const [preview, setPreview] = useState<UploadedFile | null>(() =>
    template?.previewUrl ? { url: template.previewUrl, fresh: false } : null);
  const [linkTouched, setLinkTouched] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLInputElement>(null);
  // Fresh uploads at close time, so cancel can remove them from storage
  const freshRef = useRef<string[]>([]);
  freshRef.current = preview?.fresh ? [preview.url] : [];

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape" && !saving) close(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close() {
    // Drop files uploaded in this session that never made it into a saved template
    freshRef.current.forEach(discardUpload);
    onClose();
  }

  async function uploadPreview(picked: File | undefined) {
    if (previewRef.current) previewRef.current.value = "";
    if (!picked) return;
    setError(null);
    setUploadingPreview(true);
    try {
      const formData = new FormData();
      formData.append("file", picked);
      const res = await apiFetch<{ url: string }>("/upload", { method: "POST", body: formData });
      if (preview?.fresh) discardUpload(preview.url);
      setPreview({ url: res.url, fresh: true });
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Upload failed — is the API running?");
    } finally {
      setUploadingPreview(false);
    }
  }

  function removePreview() {
    if (preview?.fresh) discardUpload(preview.url);
    setPreview(null);
  }

  async function save() {
    setError(null);
    const link = linkUrl.trim();
    if (!type.category) return setError("Pick the content pillar and category.");
    setLinkTouched(true);
    if (linkError) return;
    setSaving(true);
    try {
      const body = {
        pillar: type.pillar,
        category: type.category,
        linkUrl: link,
        previewUrl: preview?.url ?? null,
      };
      const res = await apiFetch<{ template: DesignTemplate }>(template ? `/templates/${template.id}` : "/templates", {
        method: template ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      freshRef.current = [];
      onSaved(res.template);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't save the template. Check the fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  const busy = uploadingPreview;
  const linkError = figmaLinkError(linkUrl);
  const showLinkError = linkTouched && !!linkError;
  const otherTaken = new Set([...takenCategories].filter((c) => c !== template?.category));

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/75 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) close(); }}>
      <style>{`.template-editor :focus-visible { outline: 2px solid var(--color-brand-800); outline-offset: 2px; }`}</style>
      <div role="dialog" aria-modal="true" aria-label={template ? "Edit template" : "New template"}
        className="template-editor card w-full max-w-160 max-h-[92vh] flex flex-col overflow-hidden">

        <div className="flex items-start gap-3 px-6 pt-5 pb-4 shrink-0 border-b border-border">
          <div className="flex-1">
            <h2 className="type-body-sb-m text-fg">{template ? "Edit template" : "New template"}</h2>
            <p className="type-body-r-xs mt-1 text-muted">
              The design for one content type. Marketing opens it as a reference when making a post; it is never attached to posts.
            </p>
          </div>
          <button type="button" onClick={close} disabled={saving} aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-border text-muted">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <section>
            <ContentTypeSelects idPrefix="template" pillar={type.pillar} category={type.category}
              onChange={setType} takenCategories={otherTaken} />
            <p className="type-body-r-xs mt-1.5 text-muted">One template per category.</p>
          </section>

          <div>
            <label htmlFor="template-link" className="type-body-sb-s text-fg">Figma link</label>
            <p id="template-link-hint" className="type-body-r-xs mt-0.5 text-muted">
              Link to the design in Figma, like figma.com/design/…. It opens in a new tab.
            </p>
            <input id="template-link" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value.slice(0, 2048))}
              onBlur={() => setLinkTouched(true)} type="url" inputMode="url" autoComplete="off"
              placeholder="https://www.figma.com/design/…" aria-invalid={showLinkError}
              aria-describedby={showLinkError ? "template-link-error" : "template-link-hint"}
              className={cn("field mt-1.5", showLinkError && "border-red-200 bg-red-50")} />
            {showLinkError && <p id="template-link-error" className="type-body-r-xs mt-1.5 text-red-600">{linkError}</p>}
          </div>

          <section>
            <h3 className="type-body-sb-s text-fg">
              Preview image <span className="type-body-r-xs text-muted">Optional</span>
            </h3>
            <p className="type-body-r-xs mt-0.5 text-muted">
              Shown in the library and in Compose so Marketing recognises the layout. Never attached to posts.
            </p>
            {preview ? (
              <div className="flex items-end gap-3 mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileHref(preview.url)} alt="Template preview" className="w-24 h-30 rounded-lg border border-border object-cover" />
                <button type="button" onClick={() => previewRef.current?.click()} disabled={busy}
                  className="btn-secondary px-2.5 py-1 rounded-lg type-body-r-xs">
                  {uploadingPreview ? "Uploading…" : "Replace"}
                </button>
                <button type="button" onClick={removePreview} disabled={busy}
                  className="px-2.5 py-1 rounded-lg border border-border type-body-r-xs text-muted hover:text-red-600 disabled:opacity-50">Remove</button>
              </div>
            ) : (
              <button type="button" onClick={() => previewRef.current?.click()} disabled={busy}
                className="mt-2 px-3 py-2 dropzone bg-bg type-body-r-s text-fg hover:border-neutral-300 disabled:opacity-60">
                {uploadingPreview ? "Uploading…" : "Upload preview"}
              </button>
            )}
            <input ref={previewRef} type="file" accept={IMAGE_TYPES} hidden onChange={(e) => uploadPreview(e.target.files?.[0])} />
          </section>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 shrink-0 border-t border-border">
          <p role="alert" className="flex-1 type-body-r-xs text-red-600">{error}</p>
          <button type="button" onClick={close} disabled={saving} className="btn-secondary">Cancel</button>
          <button type="button" onClick={save} disabled={saving || busy} className="btn-primary">
            {saving ? "Saving…" : template ? "Save changes" : "Save template"}
          </button>
        </div>
      </div>
    </div>
  );
}
