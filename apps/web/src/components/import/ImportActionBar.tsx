import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The bar at the bottom of every step: what is true now on the left (read out when it changes),
 * the way back and the way on on the right. It sticks to the bottom of the page's scroll area.
 */
export function ImportActionBar({ status, children, className }: { status: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 md:bottom-4",
        className
      )}
    >
      <p role="status" className="min-w-0 type-body-r-xs text-fg">
        {status}
      </p>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{children}</div>
    </div>
  );
}
