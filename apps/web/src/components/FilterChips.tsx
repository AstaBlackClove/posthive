"use client";

import type { ReactNode } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/cn";

export interface ChipOption {
  value: string;
  label: ReactNode;
  /** A coloured dot before the label; it is grey while the chip is off. Full class, e.g. "bg-green-500". */
  dot?: string | null;
  /** An icon element before the label. */
  icon?: ReactNode;
  /** A count after the label. */
  count?: number;
  className?: string;
}

type Props = {
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
  /** Accessible name: "Status", "Platform". */
  label: string;
  /** Classes for every chip, e.g. "px-3 py-1.5 rounded-xl" for the roomier toolbar chips. */
  itemClassName?: string;
  className?: string;
};

/** One-of-many filter as a row of chips (status, platform). One is always on: clicking the active chip does nothing. */
export function FilterChips({ options, value, onChange, label, itemClassName, className }: Props) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={onChange}
      aria-label={label}
      className={className}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <ToggleGroupItem key={o.value} value={o.value} className={cn(itemClassName, o.className)}>
            {o.dot && <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", active ? o.dot : "bg-neutral-300")} />}
            {o.icon}
            {o.label}
            {o.count !== undefined && <span className="ml-0.5 opacity-60 type-body-sb-xxs">{o.count}</span>}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
