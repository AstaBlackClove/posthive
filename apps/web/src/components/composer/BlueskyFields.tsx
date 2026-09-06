"use client";
import { PlatformIcon } from "../PlatformIcon";

const WARNINGS = [
  { val: "", label: "None" },
  { val: "sexual", label: "Suggestive" },
  { val: "nudity", label: "Nudity" },
  { val: "porn", label: "Explicit" },
  { val: "gore", label: "Gore" },
];

interface Props {
  blueskyContentWarning: string;
  onContentWarningChange: (v: string) => void;
}

export function BlueskyFields({ blueskyContentWarning, onContentWarningChange }: Props) {
  return (
    <div className="px-6 pb-5 pt-4" style={{ borderBottom: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-2 mb-3">
        <PlatformIcon platform="bluesky" size={13} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#0085ff" }}>Bluesky</span>
      </div>

      <div>
        <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1.5">Content Warning</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {WARNINGS.map(({ val, label }) => (
            <button key={val} type="button" onClick={() => onContentWarningChange(val)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
              style={blueskyContentWarning === val
                ? { backgroundColor: "#0085ff20", color: "#0085ff", border: "1px solid #0085ff50" }
                : { backgroundColor: "#111111", color: "#666", border: "1px solid #1f1f1f" }}>
              {label}
            </button>
          ))}
        </div>
        {blueskyContentWarning && (
          <p className="text-[10px] mt-1" style={{ color: "#f59e0b" }}>⚠️ Post will be blurred behind a content warning on Bluesky.</p>
        )}
      </div>
    </div>
  );
}
