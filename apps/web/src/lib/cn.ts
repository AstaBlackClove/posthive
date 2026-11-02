/** Join class names, skipping falsy values: cn("p-2", active && "bg-brand-100") */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
