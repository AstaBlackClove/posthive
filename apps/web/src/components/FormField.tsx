"use client";

import { useId, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

type ControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type Props = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  /** Pass the control, or a function that receives the id and aria props to spread on it. */
  children: ReactNode | ((control: ControlProps) => ReactNode);
};

/**
 * A label, a control and a hint or error, wired together: the label points at the control
 * (htmlFor) and the message is read out with it (aria-describedby, aria-invalid).
 *
 *   <FormField label="Email" error={err}>{(c) => <Input type="email" {...c} />}</FormField>
 */
export function FormField({ label, hint, error, className, children }: Props) {
  const id = useId();
  const messageId = `${id}-message`;
  const hasMessage = Boolean(error || hint);
  const control: ControlProps = {
    id,
    ...(hasMessage ? { "aria-describedby": messageId } : {}),
    ...(error ? { "aria-invalid": true as const } : {}),
  };
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="flex">{label}</Label>
      {typeof children === "function" ? children(control) : children}
      {error ? (
        <p id={messageId} role="alert" className="type-body-r-xs text-red-600">{error}</p>
      ) : hint ? (
        <p id={messageId} className="type-body-r-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
