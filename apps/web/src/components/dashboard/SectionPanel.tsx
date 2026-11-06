import type { ReactNode } from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type Props = {
  title: ReactNode;
  description?: ReactNode;
  /** Right side of the header: a badge, "View all". */
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
};

/**
 * A card of the dashboard's right column and bottom area: a title, an optional action in the
 * corner ("View all", a count badge) and the content, built on the shadcn Card. (SectionCard is the
 * settings-style card with an icon tile and a divider; this one has neither.)
 */
export function SectionPanel({ title, description, action, className, contentClassName, children }: Props) {
  return (
    <Card className={cn("gap-3 py-4", className)}>
      <CardHeader className="px-4">
        <CardTitle className="type-body-sb-m">{title}</CardTitle>
        {description && <CardDescription className="type-body-r-xs">{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className={cn("px-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
