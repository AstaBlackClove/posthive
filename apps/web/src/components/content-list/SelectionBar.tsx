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

/** The bar under the list: what is ticked and what can be done with it at once. */
export function SelectionBar({ count, submittable, canEdit, canSubmitOwn, busy, onClear, onSubmit, onDelete }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-4">
      <p className="mr-auto min-w-0 type-body-r-s text-muted-foreground" aria-live="polite">
        {count === 0 ? (
          <>0 selected · tick rows to {canSubmitOwn ? "submit several posts for review at once" : "act on several posts at once"}</>
        ) : (
          <>
            {count} selected{" "}
            <button type="button" onClick={onClear} className="cursor-pointer text-brand-800 underline underline-offset-2">
              Clear
            </button>
          </>
        )}
      </p>
      {canEdit && (
        <Button variant="destructive-outline" disabled={count === 0 || busy} onClick={onDelete}>
          Delete{count > 0 ? ` ${count}` : ""}
        </Button>
      )}
      {/* Nothing ticked: the button waits, as in the design. Something ticked and none of it can be sent (a post sent back is
          waiting for an edit, one in review has been sent): no button, as in the drawer. Part of it: only that part is sent. */}
      {canSubmitOwn && canEdit && (count === 0 || submittable > 0) && (
        <Button variant="olive" disabled={count === 0 || busy} onClick={onSubmit}>
          {count > 0 && submittable < count ? `Submit ${submittable} of ${count} for review` : "Submit selected for review"}
        </Button>
      )}
    </div>
  );
}
