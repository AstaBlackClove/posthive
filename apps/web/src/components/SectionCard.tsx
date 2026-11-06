import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  title: ReactNode;
  description?: ReactNode;
  /** An icon element; it is drawn in a brand tile. */
  icon?: ReactNode;
  /** Right side of the header: a count pill, a button. */
  action?: ReactNode;
  /** Red title and border for a danger zone. */
  tone?: "default" | "danger";
  className?: string;
  /** Classes for the body, e.g. "space-y-4" or "p-0" for a flush list. */
  bodyClassName?: string;
  children: ReactNode;
};

/** A card with a header (icon tile, title, help line, action) over a body. Settings, team, integrations. */
export function SectionCard({ title, description, icon, action, tone = "default", className, bodyClassName, children }: Props) {
  return (
    <section className={cn("card overflow-hidden", tone === "danger" && "border-red-200", className)}>
      <div className={cn("flex items-center gap-3 border-b px-6 py-4", tone === "danger" ? "border-red-200" : "border-border")}>
        {icon && (
          <div
            aria-hidden="true"
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-xl border [&_svg]:size-4",
              tone === "danger" ? "border-red-200 bg-red-50 text-red-600" : "border-brand-300 bg-brand-100 text-brand-800"
            )}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className={cn("type-body-sb-m", tone === "danger" ? "text-red-600" : "text-fg")}>{title}</h2>
          {description && <p className="mt-0.5 type-body-r-xs text-muted">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      <div className={cn("p-6", bodyClassName)}>{children}</div>
    </section>
  );
}
