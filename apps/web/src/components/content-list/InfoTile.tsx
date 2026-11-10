import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** One fact of the drawer: a small label over its value. */
export function InfoTile({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-xl bg-bg px-4 py-3", className)}>
      <dt className="type-body-r-xxs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 type-body-m-m break-words text-fg">{children}</dd>
    </div>
  );
}
