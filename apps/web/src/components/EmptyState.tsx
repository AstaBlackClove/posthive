import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  /** An icon element; it is drawn in a brand tile. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Usually a <Button> or a <Button asChild><Link>. */
  action?: ReactNode;
  /** "page" fills a whole screen area (py-24); "compact" sits inside a card (py-10). */
  size?: "page" | "compact";
  className?: string;
};

/** Nothing here yet: icon tile, title, a line of help and what to do next. */
export function EmptyState({ icon, title, description, action, size = "page", className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 text-center",
        size === "page" ? "py-24" : "py-10",
        className
      )}
    >
      {icon && (
        <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-brand-300 bg-brand-100 text-brand-800 [&_svg]:size-7" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="mb-2 type-body-sb-m text-fg">{title}</p>
      {description && <p className="max-w-xs type-body-r-s text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
