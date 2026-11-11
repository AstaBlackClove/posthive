import { Button } from "@/components/ui/button";

type Props = {
  count: number;
  /** How many of the ticked rows can be sent for review: plain drafts. One sent back, in review, scheduled or out cannot. */
  submittable: number;
  canEdit: boolean;
  /** This person sends their drafts for review (the approval flow applies to them). */
  canSubmitOwn: boolean;
  busy: boolean;
  onClear: () => void;
  onSubmit: () => void;
  onDelete: () => void;
};

/**
 * What is ticked and what can be done with it at once. It floats: `sticky` to the bottom of the page's scroll box, so the
 * buttons are in reach however long the list is, and it is there only while something is ticked (an idle bar would cover
 * the last rows for nothing). Sticky, not fixed: it stays in the page's own column and goes under the drawer and the dialogs.
 */
export function SelectionBar({ count, submittable, canEdit, canSubmitOwn, busy, onClear, onSubmit, onDelete }: Props) {
  return (
    <>
      {/* A live region added to the page together with its text is often not read out, and the bar is added with the first
          tick. So the region is always here, empty until something is ticked, and the visible count is not live too. */}
      <p role="status" aria-live="polite" className="sr-only">
        {count > 0 && `${count} ${count === 1 ? "post" : "posts"} selected`}
      </p>
      {count > 0 && (
        <div
          role="region"
          aria-label="Selected posts"
          className="sticky bottom-4 z-10 flex w-full max-w-full flex-wrap items-center gap-x-4 gap-y-2 self-center rounded-2xl border border-border bg-surface px-4 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none sm:w-fit"
        >
          <p className="min-w-0 type-body-r-s text-muted-foreground">
            {count} selected{" "}
            <button type="button" onClick={onClear} className="cursor-pointer text-brand-800 underline underline-offset-2">
              Clear
            </button>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <Button variant="destructive-outline" disabled={busy} onClick={onDelete}>
                Delete {count}
              </Button>
            )}
            {/* Something ticked and none of it can be sent (a post sent back is waiting for an edit, one in review has been sent):
                no button, as in the drawer. Part of it: only that part is sent. */}
            {canSubmitOwn && canEdit && submittable > 0 && (
              <Button variant="olive" disabled={busy} onClick={onSubmit}>
                {submittable < count ? `Submit ${submittable} of ${count} for review` : "Submit selected for review"}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
