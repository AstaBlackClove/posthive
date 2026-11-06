import type { ReactNode } from "react";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/cn";

type Props = {
  /** An icon element; it is drawn in a brand tile. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Usually a <Button> or two inside a fragment. */
  action?: ReactNode;
  /** "page" fills a whole screen area; "compact" sits inside a card; "inline" is a small tile with tight spacing. */
  size?: "page" | "compact" | "inline";
  className?: string;
};

const PADDING = { page: "py-24", compact: "py-10", inline: "py-4" } as const;

/** Nothing here yet: a thin wrapper over the shadcn Empty (icon tile, title, a line of help, next steps). */
export function EmptyState({ icon, title, description, action, size = "page", className }: Props) {
  return (
    <Empty className={cn("px-4", PADDING[size], className)}>
      <EmptyHeader>
        {icon && (
          <EmptyMedia variant="icon" aria-hidden="true">
            {icon}
          </EmptyMedia>
        )}
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent className="flex-row justify-center gap-2">{action}</EmptyContent>}
    </Empty>
  );
}
