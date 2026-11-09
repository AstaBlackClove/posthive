import Link from "next/link";
import { CheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/PlatformIcon";
import { BRAND } from "@/lib/brand";
import { formatPlanDate, type ImportSummary } from "@/lib/import-rows";
import { ImportStat } from "./ImportStat";

const MAX_NEEDS_INFO = 4;

type Props = {
  fileName: string;
  summary: ImportSummary;
};

/** Step 4: what was added, what still needs a hand, and what to do next. */
export function ImportSuccess({ fileName, summary }: Props) {
  const { imported, needsInfo, breakdown } = summary;
  const shown = needsInfo.slice(0, MAX_NEEDS_INFO);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section aria-labelledby="success-title" className="rounded-2xl border border-border bg-surface px-5 py-8 text-center sm:px-8">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-500 text-neutral-950">
          <CheckIcon aria-hidden="true" className="size-7" />
        </span>
        <h2 id="success-title" className="mt-5 type-head-sb-5">
          Your marketing plan has been imported
        </h2>
        <p className="mx-auto mt-2 max-w-xl type-body-r-s text-muted">
          {fileName} was added to your content list as {imported === 1 ? "a draft" : "drafts"}. Everything is ready to brief, assign and send for approval.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
          <ImportStat surface="tile" value={imported} label={imported === 1 ? "content item imported" : "content items imported"} />
          <ImportStat
            surface="tile"
            value={summary.channels.length}
            label={summary.channels.length === 0 ? "channels" : `${summary.channels.length === 1 ? "channel" : "channels"} · ${summary.channelsLine}`}
          />
          <ImportStat surface="tile" value={summary.firstLive ? formatPlanDate(summary.firstLive) : "—"} label="first post goes live" />
          <ImportStat surface="tile" value={needsInfo.length} tone={needsInfo.length > 0 ? "brand" : "default"} label={needsInfo.length === 1 ? "item needs additional info" : "items need additional info"} />
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <section aria-labelledby="imported-title" className="rounded-2xl border border-border bg-surface p-5">
          <h2 id="imported-title" className="type-body-sb-l">
            What was imported
          </h2>
          <p className="type-body-r-xs text-muted">By channel and category</p>
          <ul className="mt-3 space-y-3">
            {breakdown.map((b) => (
              <li key={`${b.platform}-${b.category}`} className="flex items-center gap-3">
                <PlatformIcon platform={b.platform} size={28} className="rounded-lg" />
                <span className="min-w-0 flex-1 truncate type-body-r-s">
                  {b.label} · {b.category}
                </span>
                <span className="type-body-sb-s tabular-nums">{b.count}</span>
              </li>
            ))}
            {breakdown.length === 0 && <li className="type-body-r-s text-muted">Nothing was added.</li>}
          </ul>
        </section>

        <section aria-labelledby="needs-title" className="rounded-2xl border border-border bg-surface p-5">
          <h2 id="needs-title" className="type-body-sb-l">
            {needsInfo.length === 0 ? "Nothing is missing" : `${needsInfo.length} ${needsInfo.length === 1 ? "item needs" : "items need"} additional info`}
          </h2>
          <p className="type-body-r-xs text-muted">
            {needsInfo.length === 0 ? "Every draft has a caption, a category and a channel." : "They were imported; finish them from the content list."}
          </p>
          <ul className="mt-3 space-y-2">
            {shown.map((item) => (
              <li key={item.sourceRow} className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate type-body-sb-xs">{item.title}</p>
                  <p className="truncate type-body-r-xxs text-brand-800">{item.detail}</p>
                </div>
                <Badge variant="warning" className="shrink-0">
                  Needs info
                </Badge>
              </li>
            ))}
          </ul>
          {needsInfo.length > shown.length && <p className="mt-2 type-body-r-xs text-muted">and {needsInfo.length - shown.length} more</p>}
        </section>

        <section aria-labelledby="next-title" className="rounded-2xl bg-neutral-900 p-5 text-white">
          <p className="type-body-m-xxs tracking-wide text-brand-500 uppercase">Recommended next</p>
          <h2 id="next-title" className="mt-2 type-head-sb-3 text-white">
            Brief your drafts
          </h2>
          <p className="mt-2 type-body-r-xs text-neutral-100">
            {summary.firstLive ? `The first goes live on ${formatPlanDate(summary.firstLive)}. ` : ""}Open your drafts in the content list to add a caption and media.
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-4 type-body-r-xs text-brand-500">
            <li>
              <Link href="/jobs" className="underline underline-offset-2">Open the content list</Link>
            </li>
            <li>Add a caption and media to each draft</li>
            <li>Connect your channel accounts in {BRAND.name}</li>
            <li>Send the drafts for review</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
