"use client";

import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";

type Props = {
  title: string;
  subtitle: string;
  /** Small line under the progress bar, e.g. "Taking you to setup…". */
  caption: string;
  durationMs?: number;
};

/** "You're in" screen: check mark, title and a bar that fills while the app redirects. */
export function VerifiedPanel({ title, subtitle, caption, durationMs = 1800 }: Props) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFilled(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div role="status">
      <span className="flex size-16 items-center justify-center rounded-full bg-brand-500 text-neutral-700 sm:size-20">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </span>
      <h1 className="mt-8 type-head-r-3 sm:type-head-r-1 short:mt-5">{title}</h1>
      <p className="mt-4 type-body-r-xs text-neutral-200">{subtitle}</p>
      <div className="mt-6 h-1.5 w-full max-w-60 overflow-hidden rounded-full bg-white/15">
        <div
          className={cn(
            "h-full rounded-full bg-brand-500 transition-[width] duration-(--d) ease-out motion-reduce:transition-none",
            filled ? "w-full" : "w-0",
          )}
          // The duration is runtime data from the parent, so it goes through a CSS variable.
          style={{ "--d": `${durationMs}ms` } as React.CSSProperties}
        />
      </div>
      <p className="mt-2 type-body-r-xs text-neutral-300">{caption}</p>
    </div>
  );
}
