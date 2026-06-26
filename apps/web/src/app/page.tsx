"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api";

interface Account {
  id: string;
  platform: string;
  displayName: string;
}

interface UploadedImage {
  url: string;         // URL returned by API, e.g. /uploads/uuid.jpg
  previewUrl: string;  // local object URL for preview before submit
  name: string;
}

const PLATFORM_ICON: Record<string, string> = {
  bluesky: "🦋",
  threads: "🧵",
  linkedin: "💼",
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const MAX_IMAGES = 4;

function defaultScheduledFor(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

export default function ComposePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [text, setText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState(defaultScheduledFor);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch<Account[]>("/accounts")
      .then((data) => { setAccounts(data); setSelectedIds(data.map((a) => a.id)); })
      .finally(() => setLoadingAccounts(false));
  }, []);

  function toggleAccount(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  // Shared upload logic — used by both the file picker and clipboard paste
  async function uploadFiles(files: File[]) {
    if (!files.length) return;
    const remaining = MAX_IMAGES - images.length;
    const toUpload = files.filter((f) => f.type.startsWith("image/")).slice(0, remaining);
    if (!toUpload.length) return;

    setUploading(true);
    setUploadError(null);

    for (const file of toUpload) {
      const previewUrl = URL.createObjectURL(file);
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData });
        if (!res.ok) {
          const body = await res.json() as { error: string };
          setUploadError(body.error);
          URL.revokeObjectURL(previewUrl);
          continue;
        }
        const { url } = await res.json() as { url: string };
        setImages((prev) => [...prev, { url, previewUrl, name: file.name || "pasted-image" }]);
      } catch {
        setUploadError("Upload failed — is the API running?");
        URL.revokeObjectURL(previewUrl);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    uploadFiles(Array.from(e.target.files ?? []));
  }

  // Ctrl+V / paste support — works anywhere on the compose form
  function handlePaste(e: React.ClipboardEvent) {
    const imageFiles = Array.from(e.clipboardData.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (!imageFiles.length) return; // non-image paste (text) falls through normally
    e.preventDefault();
    uploadFiles(imageFiles);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0) { setError("Select at least one account."); return; }
    setSubmitting(true); setError(null); setSuccess(false);
    try {
      await apiFetch("/jobs", {
        method: "POST",
        body: JSON.stringify({
          scheduledFor: new Date(scheduledFor).toISOString(),
          content: { text, mediaUrls: images.map((i) => i.url) },
          commentText: commentText.trim() || undefined,
          accountIds: selectedIds,
        }),
      });
      setSuccess(true);
      setText(""); setCommentText(""); setScheduledFor(defaultScheduledFor());
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setImages([]);
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const charCount = text.length;
  const overLimit = charCount > 300;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Compose</h1>
        <p className="text-gray-500 text-sm mt-1">Schedule a post and optional first comment across platforms.</p>
      </div>

      {!loadingAccounts && accounts.length === 0 && (
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
          <span className="text-lg">⚠️</span>
          <span>No accounts connected. <a href="/accounts" className="font-semibold underline">Connect one first →</a></span>
        </div>
      )}

      <form onSubmit={handleSubmit} onPaste={handlePaste} className="space-y-5">

        {/* Post text */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Post</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What do you want to share?"
            required
            rows={4}
            className={`w-full resize-none rounded-xl border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
              overLimit ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"
            }`}
          />
          <div className={`text-right text-xs mt-1.5 ${overLimit ? "text-red-500 font-medium" : "text-gray-400"}`}>
            {charCount} / 300
          </div>

          {/* Image attachments */}
          <div className="mt-4">
            {/* Previews */}
            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {images.map((img, i) => (
                  <div key={img.url} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-gray-900/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {/* Placeholder slots */}
                {Array.from({ length: MAX_IMAGES - images.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-200 bg-gray-50"
                  />
                ))}
              </div>
            )}

            {/* Upload button */}
            {images.length < MAX_IMAGES && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {uploading ? "Uploading…" : `Add image${images.length > 0 ? ` (${images.length}/${MAX_IMAGES})` : ""}` }
                </label>
                <span className="ml-2 text-xs text-gray-400">JPEG, PNG, GIF, WebP · max 1 MB · up to 4 · or paste with Ctrl+V</span>
              </div>
            )}

            {uploadError && (
              <p className="mt-2 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{uploadError}</p>
            )}
          </div>
        </div>

        {/* First comment */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            First Comment
            <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">optional</span>
          </label>
          <p className="text-xs text-gray-400 mb-3">Posted immediately after your post goes live.</p>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add context, a link, a thread continuation…"
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Account + Schedule row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Post to</label>
            {loadingAccounts ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-gray-400">No accounts connected.</p>
            ) : (
              <div className="space-y-2.5">
                {accounts.map((a) => (
                  <label key={a.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(a.id)}
                      onChange={() => toggleAccount(a.id)}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                    <span className="text-base">{PLATFORM_ICON[a.platform] ?? "🌐"}</span>
                    <div className="leading-tight">
                      <p className="text-sm font-medium text-gray-800 capitalize">{a.platform}</p>
                      <p className="text-xs text-gray-400">{a.displayName}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Schedule for</label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <p className="text-xs text-gray-400 mt-2">Picked up within 1 minute of this time.</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            ✅ Scheduled! <a href="/jobs" className="font-semibold underline ml-1">View in Jobs →</a>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || overLimit || accounts.length === 0}
          className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
        >
          {submitting ? "Scheduling…" : "Schedule Post"}
        </button>
      </form>
    </div>
  );
}
