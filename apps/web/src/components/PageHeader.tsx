import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  /** One line under the title. Hidden on a phone, where the header is short. */
  subtitle?: ReactNode;
  /** Buttons or a count pill on the right. */
  actions?: ReactNode;
};

/**
 * Top bar of a dashboard page. The .page-header class gives it h-16 so it lines up with the
 * sidebar header, and leaves room on the left for the mobile menu button.
 */
export function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="page-header">
      <div className="min-w-0">
        <h1 className="type-body-sb-l text-fg">{title}</h1>
        {subtitle && <p className="mt-0.5 hidden truncate type-body-r-xs text-muted sm:block">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
