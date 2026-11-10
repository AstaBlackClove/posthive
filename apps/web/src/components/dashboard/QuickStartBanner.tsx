import { Card } from "@/components/ui/card";
import { QuickStartStep, type QuickStart } from "./QuickStartStep";

type Props = {
  steps: QuickStart[];
  /** Hidden once the account is set up. */
  done?: boolean;
  /** The heading; the design's for a brand-new account unless the page says the account is further along. */
  title?: string;
};

/**
 * The dark banner of a new account: "Let's get your first campaign live" and four numbered steps.
 * It sits on the sidebar's olive family (neutral-900 here), so it is one of the few places the page
 * is dark; its text is white and the step cards are white at 8%.
 */
export function QuickStartBanner({ steps, done = false, title = "Let's get your first campaign live" }: Props) {
  if (done || steps.length === 0) return null;
  return (
    <Card aria-labelledby="quick-start-title" className="gap-0 border-0 bg-neutral-900 p-5 text-white xl:flex-row xl:items-center xl:gap-8 xl:p-6">
      <div className="xl:w-64 xl:shrink-0">
        <p className="type-body-m-xs text-brand-500">Quick Start</p>
        <h2 id="quick-start-title" className="mt-2 type-head-m-5 text-white">
          {title}
        </h2>
      </div>
      <ol className="mt-5 grid flex-1 gap-3 sm:grid-cols-2 xl:mt-0 xl:grid-cols-4">
        {steps.map((s) => (
          <QuickStartStep key={s.step} step={s} />
        ))}
      </ol>
    </Card>
  );
}
