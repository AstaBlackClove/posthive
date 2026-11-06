import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  /** Avatar or icon on the left. */
  leading?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Badge, select, buttons on the right. */
  trailing?: ReactNode;
  className?: string;
};

/** One row of a list: team members, invites, API keys, connected accounts. */
export function ListRow({ leading, title, description, trailing, className }: Props) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-border bg-bg px-4 py-3", className)}>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="type-body-m-s truncate text-fg">{title}</div>
        {description && <div className="truncate type-body-r-xs text-muted">{description}</div>}
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
    </div>
  );
}
