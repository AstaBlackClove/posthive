import type { ReactNode } from "react";
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type AlertTone = "danger" | "warning" | "success" | "info";

// Status colours from CLAUDE.md: 50 fill, 200 border, 700 text (danger 600, warning brand-800).
const LIGHT: Record<AlertTone, string> = {
  danger: "border-red-200 bg-red-50 text-red-600",
  warning: "border-brand-400 bg-brand-100 text-brand-800",
  success: "border-green-200 bg-green-50 text-green-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

// The dark auth panel (login, register, forgot / reset password, verify).
const DARK: Record<AlertTone, string> = {
  danger: "border-red-400/60 bg-red-500/15 text-red-200",
  warning: "border-brand-400/60 bg-brand-500/20 text-brand-100",
  success: "border-green-400/50 bg-green-500/15 text-green-200",
  info: "border-brand-400/50 bg-brand-500/10 text-brand-200",
};

const ICON = {
  danger: CircleAlertIcon,
  warning: TriangleAlertIcon,
  success: CircleCheckIcon,
  info: InfoIcon,
} as const;

type Props = {
  tone?: AlertTone;
  /** Dark-panel palette (auth screens). */
  onDark?: boolean;
  title?: ReactNode;
  /** Replace the tone's icon, or pass null for none. */
  icon?: ReactNode | null;
  id?: string;
  className?: string;
  children: ReactNode;
};

/**
 * A notice inside a page or a dialog (a toast is for something that just happened).
 * Danger and warning are announced at once (role=alert), success and info politely (role=status).
 */
export function InlineAlert({ tone = "danger", onDark = false, title, icon, id, className, children }: Props) {
  const Icon = ICON[tone];
  return (
    <div
      id={id}
      data-tone={tone}
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 type-body-r-s",
        (onDark ? DARK : LIGHT)[tone],
        className
      )}
    >
      {icon === null ? null : (
        <span className="mt-0.5 shrink-0 [&_svg]:size-4" aria-hidden="true">
          {icon ?? <Icon />}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {title && <p className="type-body-sb-s">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
