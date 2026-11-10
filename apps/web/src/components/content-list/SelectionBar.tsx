import { Button } from "@/components/ui/button";

type Props = {
  count: number;
  canEdit: boolean;
  /** This person sends their drafts for review (the approval flow applies to them). */
  canSubmitOwn: boolean;
  busy: boolean;
  onClear: () => void;
  onSubmit: () => void;
  onDelete: () => void;
};

/** The bar under the list: what is ticked and what can be done with it at once. */
export function SelectionBar({ count, canEdit, canSubmitOwn, busy, onClear, onSubmit, onDelete }: Props) {
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
      {canSubmitOwn && canEdit && (
        <Button variant="olive" disabled={count === 0 || busy} onClick={onSubmit}>
          Submit selected for review
        </Button>
      )}
    </div>
  );
}
