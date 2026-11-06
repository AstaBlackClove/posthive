"use client";

import { useMemo, useState } from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { fieldClass } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { timezoneLabel, timezoneOptions } from "@/lib/timezones";

type Props = {
  value: string;
  onChange: (zone: string) => void;
  /** Put the same id on the <label htmlFor>. */
  id?: string;
  "aria-label"?: string;
  className?: string;
};

/**
 * A timezone you search by typing ("jak", "new york") instead of scrolling a list of 400.
 * The saved value always stays selectable, even if this browser does not list it.
 */
export function TimezoneSelect({ value, onChange, id, "aria-label": ariaLabel, className }: Props) {
  const [open, setOpen] = useState(false);
  const zones = useMemo(() => timezoneOptions(value), [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          className={cn(fieldClass, "flex cursor-pointer items-center justify-between gap-2", className)}
        >
          <span className="truncate">{value ? timezoneLabel(value) : "Select a timezone"}</span>
          <ChevronsUpDownIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-60 p-0">
        <Command>
          <CommandInput placeholder="Search timezone…" />
          <CommandList>
            <CommandEmpty>No timezone found</CommandEmpty>
            {zones.map((zone) => (
              <CommandItem
                key={zone}
                value={zone}
                // typing "new york" or "jak" finds America/New_York and Asia/Jakarta
                keywords={[timezoneLabel(zone)]}
                onSelect={() => {
                  onChange(zone);
                  setOpen(false);
                }}
              >
                {timezoneLabel(zone)}
                {zone === value && <CheckIcon aria-hidden="true" className="ml-auto" />}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
