import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { LIST_STATUS, type ListCounts, type ListFilter } from "@/lib/content-list";

/** The colour of a status's number, as the design tints them: the ones that ask for action or went well stand out. */
const NUMBER: Partial<Record<ListFilter, string>> = {
  rejected: "text-red-600",
  failed: "text-red-600",
  done: "text-blue-700",
};

type Props = {
  counts: ListCounts;
  /** The statuses this role has: a card each, in this order. */
  filters: Exclude<ListFilter, "all">[];
  /** The tab on screen: its card is outlined. */
  active: ListFilter;
  onPick: (filter: ListFilter) => void;
};

/** One card per status with how many posts are in it: the list's own small dashboard. A card opens that status's tab. */
export function StatusCounts({ counts, filters, active, onPick }: Props) {
  return (
    // flex, not a grid: the last row stretches to the full width instead of leaving an empty cell
    <ul aria-label="Posts by status" className="flex flex-wrap gap-3">
      {filters.map((f) => (
        <li key={f} className="min-w-0 grow basis-36">
          <Card
            className={cn("h-full gap-0 p-0 transition-colors", active === f ? "border-neutral-500" : "hover:border-neutral-300")}
            data-active={active === f || undefined}
          >
            <button
              type="button"
              onClick={() => onPick(f)}
              aria-pressed={active === f}
              aria-label={`${LIST_STATUS[f]}: ${counts[f]}`}
              className="flex h-full min-w-0 cursor-pointer flex-col items-start gap-1 rounded-2xl px-4 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <span className={cn("type-head-r-3 tabular-nums", NUMBER[f] ?? "text-fg", f === "draft" && counts[f] === 0 && "text-fg")}>{counts[f]}</span>
              <span className="type-body-r-s text-muted-foreground">{LIST_STATUS[f]}</span>
            </button>
          </Card>
        </li>
      ))}
    </ul>
  );
}
