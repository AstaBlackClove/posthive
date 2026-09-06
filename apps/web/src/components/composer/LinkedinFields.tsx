"use client";
import { PlatformIcon } from "../PlatformIcon";

interface Props {
  linkedinVisibility: "PUBLIC" | "CONNECTIONS";
  onVisibilityChange: (v: "PUBLIC" | "CONNECTIONS") => void;
}

export function LinkedinFields({ linkedinVisibility, onVisibilityChange }: Props) {
  return (
    <div className="px-6 pb-5 pt-4" style={{ borderBottom: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-2 mb-3">
        <PlatformIcon platform="linkedin" size={13} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#0a66c2" }}>LinkedIn</span>
      </div>

      <div>
        <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1.5">Visibility</span>
        <div className="flex items-center gap-1.5">
          {([
            { value: "PUBLIC", label: "Public" },
            { value: "CONNECTIONS", label: "Connections Only" },
          ] as const).map(({ value, label }) => (
            <button key={value} type="button" onClick={() => onVisibilityChange(value)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
              style={linkedinVisibility === value
                ? { backgroundColor: "#0a66c220", color: "#0a66c2", border: "1px solid #0a66c250" }
                : { backgroundColor: "#111111", color: "#666", border: "1px solid #1f1f1f" }}>
              {label}
            </button>
          ))}
        </div>
        {linkedinVisibility === "CONNECTIONS" && (
          <p className="text-[10px] mt-1" style={{ color: "#888" }}>Only your 1st-degree connections can see this post.</p>
        )}
      </div>
    </div>
  );
}
