import { cn } from "@/lib/cn";

const SIZE = { sm: "size-3.5 border-2", md: "size-5 border-2", lg: "size-8 border-[3px]" } as const;

/** Loading ring in the current text colour: wrap it in text-fg, text-muted, text-brand-800… */
export function Spinner({ size = "md", label = "Loading", className }: { size?: keyof typeof SIZE; label?: string; className?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-block shrink-0 animate-spin rounded-full border-current border-t-transparent", SIZE[size], className)}
    />
  );
}
