"use client";
import { useId, useRef } from "react";
import { PlatformIcon } from "../PlatformIcon";

interface Props {
  trialReel: boolean;
  onTrialReelChange: (v: boolean) => void;
  graduation: "MANUAL" | "SS_PERFORMANCE";
  onGraduationChange: (v: "MANUAL" | "SS_PERFORMANCE") => void;
  coverUrl: string | null;
  coverPreview: string | null;
  onCoverUpload: (file: File) => void;
  onCoverRemove: () => void;
  coverUploading?: boolean;
}

export function InstagramTrialReelFields({
  trialReel, onTrialReelChange, graduation, onGraduationChange,
  coverUrl, coverPreview, onCoverUpload, onCoverRemove, coverUploading,
}: Props) {
  const uid = useId();
  const coverInputId = `${uid}-ig-cover`;
  const coverInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="px-6 pb-5 pt-3" style={{ borderBottom: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-2 mb-3">
        <PlatformIcon platform="instagram" size={13} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#E1306C" }}>Instagram</span>
      </div>

      {/* Cover image */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide">Cover</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: "#999", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>optional</span>
        </div>
        <div className="flex items-center gap-3">
          {(coverPreview ?? coverUrl) ? (
            <div className="relative group flex-shrink-0 w-16 h-28 rounded-lg overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverPreview ?? coverUrl!} alt="cover" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={onCoverRemove}
                className="absolute top-1 right-1 w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: "rgba(239,68,68,0.9)" }}>✕</button>
            </div>
          ) : null}
          <div>
            <input
              ref={coverInputRef}
              id={coverInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { onCoverUpload(f); if (coverInputRef.current) coverInputRef.current.value = ""; }
              }}
            />
            <label
              htmlFor={coverInputId}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${coverUploading ? "opacity-40 pointer-events-none" : "hover:border-white/20"}`}
              style={{ border: "1px solid #2a2a2a", backgroundColor: "#111111", color: "#888" }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {coverUploading ? "Uploading…" : (coverUrl ? "Change cover" : "Add cover")}
            </label>
            <p className="text-[10px] mt-1" style={{ color: "#999" }}>JPG/PNG/WEBP · defaults to the video's first frame if left blank</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wide">Trial Reel</span>
          <p className="text-[10px] mt-0.5" style={{ color: "#666" }}>Shown to non-followers first. Requires 200+ followers on the account.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={trialReel}
          onClick={() => onTrialReelChange(!trialReel)}
          className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
          style={{ backgroundColor: trialReel ? "#E1306C" : "#2a2a2a" }}>
          <span
            className="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition duration-200"
            style={{ transform: trialReel ? "translateX(16px)" : "translateX(0)" }}
          />
        </button>
      </div>

      {trialReel && (
        <div className="mt-3">
          <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1.5">Graduation</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {([
              { value: "MANUAL", label: "Manual" },
              { value: "SS_PERFORMANCE", label: "Auto (performance)" },
            ] as const).map(({ value, label }) => (
              <button key={value} type="button" onClick={() => onGraduationChange(value)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                style={graduation === value
                  ? { backgroundColor: "#E1306C20", color: "#E1306C", border: "1px solid #E1306C50" }
                  : { backgroundColor: "#111111", color: "#666", border: "1px solid #1f1f1f" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
