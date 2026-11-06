import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type Props = {
  tone?: "error" | "info";
  id?: string;
  className?: string;
  children: ReactNode;
};

const TONE = {
  error: "border-red-400/60 bg-red-500/15 text-red-200",
  info: "border-brand-400/50 bg-brand-500/10 text-brand-200",
} as const;

/** Notice on the dark auth panel. Errors are announced immediately, info politely. */
export function AuthAlert({ tone = "error", id, className, children }: Props) {
  return (
    <div
      id={id}
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-xl border px-3.5 py-3 type-body-r-s", TONE[tone], className)}
    >
      <svg className="mt-0.5 size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        {tone === "error" ? <path d="M12 7.5v5.5M12 16.5h.01" /> : <path d="M12 11v5.5M12 7.5h.01" />}
      </svg>
      <span>{children}</span>
    </div>
  );
}
