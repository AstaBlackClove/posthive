import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { STEPS, stepIndex, type ImportStep } from "@/lib/import-file";

/**
 * The four steps of the plan import. The step you are on is yellow with its number, finished
 * steps are olive with a check, the rest are grey. On a phone only the circles show, with
 * "Step 2 of 4 · Map columns" under them.
 */
export function ImportStepper({ current }: { current: ImportStep }) {
  const at = stepIndex(current);
  // On the last step everything is done: the circle shows a check, not a "4" to be reached
  const finished = current === "done";

  return (
    <nav aria-label="Import progress" className="rounded-2xl border border-border bg-surface px-4 py-4 sm:px-8">
      <ol className="flex items-start">
        {STEPS.map((step, i) => {
          const done = i < at || finished;
          const active = i === at && !finished;
          return (
            <li
              key={step.id}
              aria-current={active ? "step" : undefined}
              className={cn("flex items-start", i < STEPS.length - 1 ? "flex-1" : "shrink-0")}
            >
              <div className="flex flex-col items-center gap-1.5 text-center">
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full type-body-sb-s",
                    done && "bg-neutral-600 text-white",
                    active && "bg-brand-500 text-neutral-950",
                    !done && !active && "bg-neutral-100 text-neutral-600"
                  )}
                >
                  {done ? <CheckIcon aria-hidden="true" className="size-4" /> : i + 1}
                  <span className="sr-only">{done ? " (done)" : active ? " (current)" : ""}</span>
                </span>
                <span className="hidden sm:block">
                  <span className={cn("block type-body-sb-s", active || done ? "text-fg" : "text-muted")}>{step.title}</span>
                  <span className="block type-body-r-xs text-muted">{step.hint}</span>
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span aria-hidden="true" className={cn("mx-3 mt-4 h-0.5 flex-1 rounded-full sm:mx-6", i < at || finished ? "bg-neutral-600" : "bg-neutral-100")} />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-center type-body-sb-xs text-fg sm:hidden">
        {finished ? "Done" : `Step ${at + 1} of ${STEPS.length}`} · {STEPS[at].title}
      </p>
    </nav>
  );
}
