import type { ReactNode } from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { statusLabel, type ContentStatusKey } from "@/lib/content-status";
import { StatusDot } from "./StatusDot";

// The pill of a status, as the design draws it in the side panels, the calendar and the table: a tint of
// the status colour with a dot, or (Approved, Changes requested) the colour itself with white text.
// The strings are written out so Tailwind sees every class.

const SOFT: Record<ContentStatusKey, string> = {
  brief: "bg-neutral-50 text-neutral-800",
  copywriting: "bg-neutral-50 text-neutral-800",
  design: "bg-neutral-50 text-neutral-800",
  review: "bg-brand-100 text-brand-800",
  changes: "bg-red-500/10 text-red-600",
  approved: "bg-green-600/10 text-green-700",
  scheduled: "bg-neutral-50 text-neutral-800",
  published: "bg-brand-100 text-brand-800",
  failed: "bg-red-500/10 text-red-600",
};

const SOLID: Partial<Record<ContentStatusKey, string>> = {
  approved: "bg-green-700 text-white",
  changes: "bg-status-changes text-white",
};

/** The classes of a status's pill; `solid` fills it with the status colour where the design does. */
export function pillTone(status: ContentStatusKey, solid = false): string {
  return (solid && SOLID[status]) || SOFT[status];
}

type Props = {
  status: ContentStatusKey;
  /** Fill with the status colour (Approved, Changes requested); other statuses stay tinted. */
  solid?: boolean;
  /** A check instead of the dot, as on an approved post in the side panels. */
  check?: boolean;
  /** Replaces the status's name: "Scheduled · today 14:00". */
  children?: ReactNode;
  className?: string;
};

/** A status as a pill: its dot (or a check) and its name. */
export function StatusPill({ status, solid = false, check = false, children, className }: Props) {
  const filled = solid && status in SOLID;
  return (
    <span className={cn("inline-flex w-fit max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5 type-body-sb-xxs whitespace-nowrap", pillTone(status, solid), className)}>
      {check ? <CheckIcon aria-hidden="true" className="size-3 shrink-0" /> : <StatusDot status={status} className={cn("size-1.5", filled && "bg-white")} />}
      <span className="truncate">{children ?? statusLabel(status)}</span>
    </span>
  );
}
