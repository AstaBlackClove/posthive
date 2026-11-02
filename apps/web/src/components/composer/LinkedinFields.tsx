"use client";
import { PlatformIcon } from "../PlatformIcon";
import { cn } from "@/lib/cn";

interface Props {
  linkedinVisibility: "PUBLIC" | "CONNECTIONS";
  onVisibilityChange: (v: "PUBLIC" | "CONNECTIONS") => void;
}

export function LinkedinFields({ linkedinVisibility, onVisibilityChange }: Props) {
  return (
    <div className="border-b border-border px-6 pb-5 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <PlatformIcon platform="linkedin" size={13} />
        <span className="section-label text-[#0a66c2]">LinkedIn</span>
      </div>

      <div>
        <span className="section-label block mb-1.5">Visibility</span>
        <div className="flex items-center gap-1.5">
          {([
            { value: "PUBLIC", label: "Public" },
            { value: "CONNECTIONS", label: "Connections Only" },
          ] as const).map(({ value, label }) => (
            <button key={value} type="button" onClick={() => onVisibilityChange(value)}
              className={cn(
                "chip",
                linkedinVisibility === value && "chip-active",
              )}>
              {label}
            </button>
          ))}
        </div>
        {linkedinVisibility === "CONNECTIONS" && (
          <p className="type-body-r-xxs mt-1 text-muted">Only your 1st-degree connections can see this post.</p>
        )}
      </div>
    </div>
  );
}
