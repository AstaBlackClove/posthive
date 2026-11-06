/**
 * The one place the status colours live (CLAUDE.md): a 50 fill, a 200 border and a 700 text
 * (danger text is 600; warning is the brand yellow with a brand-800 text, never text-accent).
 * Badge, Alert, InlineAlert, the toast and the status badges all read from here.
 * The strings are written out in full so Tailwind can see every class.
 */
export const TONE = {
  neutral: "border-border bg-surface text-muted",
  /** Quiet but readable: a count, a trial with plenty of days left. */
  plain: "border-border bg-bg text-fg",
  brand: "border-brand-300 bg-brand-100 text-brand-800",
  success: "border-green-200 bg-green-50 text-green-700",
  danger: "border-red-200 bg-red-50 text-red-600",
  warning: "border-brand-400 bg-brand-100 text-brand-800",
  info: "border-blue-200 bg-blue-50 text-blue-700",
} as const;

export type Tone = keyof typeof TONE;
