"use client";
import { PlatformIcon } from "../PlatformIcon";

interface Props {
  sensitive: boolean;
  onSensitiveChange: (v: boolean) => void;
  visibility: "public" | "unlisted" | "private";
  onVisibilityChange: (v: "public" | "unlisted" | "private") => void;
}

export function PixelfedFields({ sensitive, onSensitiveChange, visibility, onVisibilityChange }: Props) {
  return (
    <div className="px-6 pb-5 pt-3" style={{ borderBottom: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-2 mb-3">
        <PlatformIcon platform="pixelfed" size={13} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#ff8c00" }}>Pixelfed</span>
      </div>

      {/* Audience */}
      <div className="mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1.5">Audience</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {([
            { value: "public", label: "Public" },
            { value: "unlisted", label: "Unlisted" },
            { value: "private", label: "Followers Only" },
          ] as const).map(({ value, label }) => (
            <button key={value} type="button" onClick={() => onVisibilityChange(value)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
              style={visibility === value
                ? { backgroundColor: "#ff8c0020", color: "#ff8c00", border: "1px solid #ff8c0050" }
                : { backgroundColor: "#111111", color: "#666", border: "1px solid #1f1f1f" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sensitive / NSFW */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wide">Sensitive / NSFW</span>
          <p className="text-[10px] mt-0.5" style={{ color: "#666" }}>Blurs media behind a content warning</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={sensitive}
          onClick={() => onSensitiveChange(!sensitive)}
          className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
          style={{ backgroundColor: sensitive ? "#ff8c00" : "#2a2a2a" }}>
          <span
            className="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition duration-200"
            style={{ transform: sensitive ? "translateX(16px)" : "translateX(0)" }}
          />
        </button>
      </div>
    </div>
  );
}
