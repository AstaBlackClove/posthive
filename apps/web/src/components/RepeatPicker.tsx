"use client";

import { RepeatIcon } from "lucide-react";
import { DatePicker } from "./DatePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { minKeyForInterval } from "@/lib/datetime";

const INTERVALS = [
  { value: "daily", label: "Every Day" },
  { value: "weekly", label: "Every Week" },
  { value: "monthly", label: "Every Month" },
] as const;

type Interval = "daily" | "weekly" | "monthly";

// Radix Select cannot have an item with value "": "Do Not Repeat" gets a name of its own.
const NONE = "none";

interface Props {
  value: Interval | "";
  endsAt: string;
  onChangeInterval: (v: Interval | "") => void;
  onChangeEndsAt: (v: string) => void;
}

/** How often a post repeats (opens upward, like the compose footer it sits in), and until when. */
export function RepeatPicker({ value, endsAt, onChangeInterval, onChangeEndsAt }: Props) {
  const label = value ? INTERVALS.find((i) => i.value === value)?.label : "Repeat Post…";

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value || NONE}
        onValueChange={(next) => {
          onChangeInterval(next === NONE ? "" : (next as Interval));
          onChangeEndsAt("");
        }}
      >
        <SelectTrigger aria-label="Repeat" className={cn("w-auto py-1.5", value ? "text-fg" : "text-muted")}>
          <span className="flex items-center gap-1.5">
            <RepeatIcon aria-hidden="true" className={cn("size-3.5", value ? "text-brand-800" : "text-neutral-500")} />
            <SelectValue>{label}</SelectValue>
          </span>
        </SelectTrigger>
        <SelectContent side="top" align="start">
          <SelectItem value={NONE}>Do Not Repeat</SelectItem>
          {INTERVALS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value && (
        <div className="flex items-center gap-1.5">
          <span className="type-body-m-s text-muted">until</span>
          <DatePicker value={endsAt} onChange={onChangeEndsAt} min={minKeyForInterval(value)} placeholder="End date (optional)" />
        </div>
      )}
    </div>
  );
}
