import { InfoIcon } from "lucide-react";

/** Shown while everything in the workspace is still a draft after an import: the road a post takes from here. */
export function DraftBanner() {
  return (
    <section role="status" className="flex items-start gap-3 rounded-2xl bg-brand-100 px-5 py-4">
      <InfoIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-800" />
      <div className="min-w-0">
        <h2 className="type-body-m-m text-brand-800">All imported posts are in Draft</h2>
        <p className="mt-0.5 type-body-r-s text-brand-800">
          Draft → In Review → Revision Required → Ready to Publish → Published. Click any row to preview it, then use Edit Content to pick a template or upload a design.
        </p>
      </div>
    </section>
  );
}
