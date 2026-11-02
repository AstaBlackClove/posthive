"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api";
import type { Category } from "../lib/contentTypes";
import { fileHref, formatBytes, type DesignTemplate } from "../lib/templates";
import { ContentTypeSelects, type ContentType } from "./ContentTypeSelects";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const MAX_FILE_BYTES = 50 * 1024 * 1024; // matches TEMPLATE_FILE_MAX_BYTES in the API
const IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif";

interface UploadedFile {
  url: string;
  /** Uploaded in this editor session and not saved yet — safe to delete from storage. */
  fresh: boolean;
}

interface DesignFile extends UploadedFile {
  fileName: string;
  fileSize: number | null;
}

const inputStyle = { background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "9px 12px", fontSize: 14, color: "#ededed" } as const;
const secondaryButton = { border: "1px solid #2a2a2a", color: "#ededed" } as const;

function discardUpload(url: string) {
  fetch(`${API_BASE}/upload`, { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }).catch(() => {});
}

// Design team only: the reference design for one content type (Pillar + Category) —
// an editable .fig file and/or a link, plus an optional preview image. Marketing sees it
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
  const [file, setFile] = useState<DesignFile | null>(() =>
    template?.fileUrl ? { url: template.fileUrl, fileName: template.fileName ?? "design.fig", fileSize: template.fileSize, fresh: false } : null);
  const [linkUrl, setLinkUrl] = useState(template?.linkUrl ?? "");
  const [preview, setPreview] = useState<UploadedFile | null>(() =>
    template?.previewUrl ? { url: template.previewUrl, fresh: false } : null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLInputElement>(null);
  // Fresh uploads at close time, so cancel can remove them from storage
  const freshRef = useRef<string[]>([]);
  freshRef.current = [file, preview].filter((f): f is UploadedFile => !!f?.fresh).map((f) => f.url);

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

  async function uploadFile(picked: File | undefined) {
    if (fileRef.current) fileRef.current.value = "";
    if (!picked) return;
    setError(null);
    if (!/\.fig$/i.test(picked.name)) return setError("Upload a Figma design file (.fig). In Figma use File → Save local copy.");
    if (picked.size > MAX_FILE_BYTES) return setError(`The file is ${formatBytes(picked.size)}. The maximum is 50 MB.`);
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", picked);
      const res = await apiFetch<{ url: string; fileName: string; fileSize: number }>("/templates/file", { method: "POST", body: formData });
      // A replaced upload from this session is no longer needed; a saved one is removed by the API on save
      if (file?.fresh) discardUpload(file.url);
      setFile({ url: res.url, fileName: res.fileName, fileSize: res.fileSize, fresh: true });
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Upload failed — is the API running?");
    } finally {
      setUploadingFile(false);
    }
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

  function removeFile() {
    if (file?.fresh) discardUpload(file.url);
    setFile(null);
  }

  function removePreview() {
    if (preview?.fresh) discardUpload(preview.url);
    setPreview(null);
  }

  async function save() {
    setError(null);
    const link = linkUrl.trim();
    if (!type.category) return setError("Pick the content pillar and category.");
    if (!file && !link) return setError("Upload the design file (.fig) or add a link to it.");
    if (link && !/^https:\/\/\S+$/i.test(link)) return setError("The link must start with https://");
    setSaving(true);
    try {
      const body = {
        pillar: type.pillar,
        category: type.category,
        fileUrl: file?.url ?? null,
        fileName: file?.fileName ?? null,
        fileSize: file?.fileSize ?? null,
        linkUrl: link || null,
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

  const busy = uploadingFile || uploadingPreview;
  const otherTaken = new Set([...takenCategories].filter((c) => c !== template?.category));

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) close(); }}>
      <style>{`.template-editor :focus-visible { outline: 2px solid #5b63d3; outline-offset: 2px; }`}</style>
      <div role="dialog" aria-modal="true" aria-label={template ? "Edit template" : "New template"}
        className="template-editor w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 640, maxHeight: "92vh", background: "#111111", border: "1px solid #2a2a2a", borderRadius: 16 }}>

        <div className="flex items-start gap-3 px-6 pt-5 pb-4 shrink-0" style={{ borderBottom: "1px solid #2a2a2a" }}>
          <div className="flex-1">
            <h2 className="text-base font-bold" style={{ color: "#ededed" }}>{template ? "Edit template" : "New template"}</h2>
            <p className="text-xs mt-1" style={{ color: "#888" }}>
              The design for one content type. Marketing opens it as a reference when making a post; it is never attached to posts.
            </p>
          </div>
          <button type="button" onClick={close} disabled={saving} aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ color: "#888", border: "1px solid #2a2a2a" }}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <section>
            <ContentTypeSelects idPrefix="template" pillar={type.pillar} category={type.category}
              onChange={setType} takenCategories={otherTaken} selectStyle={inputStyle} />
            <p className="text-xs mt-1.5" style={{ color: "#888" }}>One template per category.</p>
          </section>

          <section>
            <h3 className="text-sm font-semibold" style={{ color: "#ededed" }}>Design file</h3>
            <p className="text-xs mt-0.5" style={{ color: "#888" }}>
              Figma file (.fig), up to 50 MB. In Figma use File → Save local copy.
            </p>
            {file ? (
              <div className="flex items-center gap-3 mt-2 p-3 rounded-xl" style={{ border: "1px solid #2a2a2a", background: "#0a0a0a" }}>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-sm shrink-0" style={{ background: "#1f1f1f", color: "#ededed" }}>FIG</span>
                <a href={fileHref(file.url)} download={file.fileName} className="flex-1 min-w-0 text-sm truncate underline-offset-2 hover:underline" style={{ color: "#ededed" }}>
                  {file.fileName}
                </a>
                {file.fileSize ? <span className="text-xs shrink-0" style={{ color: "#888" }}>{formatBytes(file.fileSize)}</span> : null}
                <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
                  className="px-2.5 py-1 rounded-lg text-xs disabled:opacity-50" style={secondaryButton}>Replace</button>
                <button type="button" onClick={removeFile} disabled={busy} aria-label="Remove the design file"
                  className="w-7 h-7 rounded-lg text-xs hover:text-red-400 disabled:opacity-50" style={{ border: "1px solid #2a2a2a", color: "#888" }}>✕</button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
                className="w-full mt-2 py-3 rounded-xl text-sm font-medium disabled:opacity-60"
                style={{ border: "1px dashed #2a2a2a", color: "#ededed" }}>
                {uploadingFile ? "Uploading…" : "Upload .fig file"}
              </button>
            )}
            {file && uploadingFile && <p className="text-xs mt-1.5" style={{ color: "#888" }}>Uploading…</p>}
            <input ref={fileRef} type="file" accept=".fig" hidden onChange={(e) => uploadFile(e.target.files?.[0])} />
          </section>

          <label className="block">
            <span className="text-sm font-semibold" style={{ color: "#ededed" }}>Link</span>
            <span className="block text-xs mt-0.5" style={{ color: "#888" }}>
              Link to the design, e.g. the Figma file. Optional when you upload the file.
            </span>
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value.slice(0, 2048))} type="url" inputMode="url"
              placeholder="https://www.figma.com/design/…" className="w-full mt-1.5" style={inputStyle} />
          </label>

          <section>
            <h3 className="text-sm font-semibold" style={{ color: "#ededed" }}>
              Preview image <span className="text-xs font-normal" style={{ color: "#888" }}>Optional</span>
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "#888" }}>
              Shown in the library and in Compose so Marketing recognises the layout. Never attached to posts.
            </p>
            {preview ? (
              <div className="flex items-end gap-3 mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileHref(preview.url)} alt="Template preview" className="rounded-lg object-cover"
                  style={{ width: 96, height: 120, border: "1px solid #2a2a2a" }} />
                <button type="button" onClick={() => previewRef.current?.click()} disabled={busy}
                  className="px-2.5 py-1 rounded-lg text-xs disabled:opacity-50" style={secondaryButton}>
                  {uploadingPreview ? "Uploading…" : "Replace"}
                </button>
                <button type="button" onClick={removePreview} disabled={busy}
                  className="px-2.5 py-1 rounded-lg text-xs hover:text-red-400 disabled:opacity-50" style={{ border: "1px solid #2a2a2a", color: "#888" }}>Remove</button>
              </div>
            ) : (
              <button type="button" onClick={() => previewRef.current?.click()} disabled={busy}
                className="mt-2 px-3 py-2 rounded-xl text-sm disabled:opacity-60" style={{ border: "1px dashed #2a2a2a", color: "#ededed" }}>
                {uploadingPreview ? "Uploading…" : "Upload preview"}
              </button>
            )}
            <input ref={previewRef} type="file" accept={IMAGE_TYPES} hidden onChange={(e) => uploadPreview(e.target.files?.[0])} />
          </section>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 shrink-0" style={{ borderTop: "1px solid #2a2a2a" }}>
          <p role="alert" className="flex-1 text-xs" style={{ color: "#f87171" }}>{error}</p>
          <button type="button" onClick={close} disabled={saving}
            className="px-4 py-2 rounded-xl text-sm" style={{ border: "1px solid #2a2a2a", color: "#888" }}>Cancel</button>
          <button type="button" onClick={save} disabled={saving || busy}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-100 disabled:opacity-60"
            style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
            {saving ? "Saving…" : template ? "Save changes" : "Save template"}
          </button>
        </div>
      </div>
    </div>
  );
}
