"use client";
import { PlatformIcon } from "../PlatformIcon";
import { cn } from "@/lib/cn";

interface Props {
  sensitive: boolean;
  onSensitiveChange: (v: boolean) => void;
  visibility: "public" | "unlisted" | "private";
  onVisibilityChange: (v: "public" | "unlisted" | "private") => void;
}

export function PixelfedFields({ sensitive, onSensitiveChange, visibility, onVisibilityChange }: Props) {
  return (
    <div className="border-b border-border px-6 pb-5 pt-3">
      <div className="flex items-center gap-2 mb-3">
        <PlatformIcon platform="pixelfed" size={13} />
        <span className="section-label text-[#ff8c00]">Pixelfed</span>
      </div>

      {/* Audience */}
      <div className="mb-3">
        <span className="section-label block mb-1.5">Audience</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {([
            { value: "public", label: "Public" },
            { value: "unlisted", label: "Unlisted" },
            { value: "private", label: "Followers Only" },
          ] as const).map(({ value, label }) => (
            <button key={value} type="button" onClick={() => onVisibilityChange(value)}
              className={cn(
                "chip",
                visibility === value && "chip-active",
              )}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sensitive / NSFW */}
      <div className="flex items-center justify-between">
        <div>
          <span className="section-label">Sensitive / NSFW</span>
          <p className="type-body-r-xxs mt-0.5 text-muted">Blurs media behind a content warning</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={sensitive}
          onClick={() => onSensitiveChange(!sensitive)}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden",
            sensitive ? "bg-accent" : "bg-neutral-200",
          )}>
          <span
            className={cn(
              "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition duration-200",
              sensitive ? "translate-x-4" : "translate-x-0",
            )}
          />
        </button>
      </div>
    </div>
  );
}
