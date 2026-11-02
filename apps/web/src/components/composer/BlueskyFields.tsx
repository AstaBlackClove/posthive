"use client";
import { PlatformIcon } from "../PlatformIcon";
import { cn } from "@/lib/cn";

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
    <div className="border-b border-border px-6 pb-5 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <PlatformIcon platform="bluesky" size={13} />
        <span className="section-label text-[#0085ff]">Bluesky</span>
      </div>

      <div>
        <span className="section-label block mb-1.5">Content Warning</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {WARNINGS.map(({ val, label }) => (
            <button key={val} type="button" onClick={() => onContentWarningChange(val)}
              className={cn(
                "chip",
                blueskyContentWarning === val && "chip-active",
              )}>
              {label}
            </button>
          ))}
        </div>
        {blueskyContentWarning && (
          <p className="type-body-r-xxs mt-1 text-brand-800">⚠️ Post will be blurred behind a content warning on Bluesky.</p>
        )}
      </div>
    </div>
  );
}
