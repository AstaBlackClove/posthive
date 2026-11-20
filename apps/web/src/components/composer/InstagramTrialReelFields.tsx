"use client";
import { PlatformIcon } from "../PlatformIcon";

interface Props {
  trialReel: boolean;
  onTrialReelChange: (v: boolean) => void;
  graduation: "MANUAL" | "SS_PERFORMANCE";
  onGraduationChange: (v: "MANUAL" | "SS_PERFORMANCE") => void;
}

export function InstagramTrialReelFields({ trialReel, onTrialReelChange, graduation, onGraduationChange }: Props) {
  return (
    <div className="px-6 pb-5 pt-3" style={{ borderBottom: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-2 mb-3">
        <PlatformIcon platform="instagram" size={13} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#E1306C" }}>Instagram</span>
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
