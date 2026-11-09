"use client";

import { useMemo, useState } from "react";
import { CircleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DatePicker } from "@/components/DatePicker";
import { FormField } from "@/components/FormField";
import { cn } from "@/lib/cn";
import { formatPlanDate, rowState, suggestDates } from "@/lib/import-rows";
import { IMPORT_PLATFORMS, duplicateIndex, issuesOf, type FieldIssue, type ReviewFields, type ReviewRow } from "@/lib/importReview";
import { platformLabel } from "@/lib/platforms";

export type RowFixes = Record<number, Partial<ReviewFields>>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Every row of the import: a fix can make a row a copy of another one. */
  rows: ReviewRow[];
  /** The rows to fix, by file row number. */
  fixing: number[];
  serverErrors: ReadonlyMap<number, FieldIssue[]>;
  /** The fixes and the rows the user set aside while fixing. Nothing is applied before this. */
  onSave: (fixes: RowFixes, exclude: number[]) => void;
};

/**
 * "Fix records before import": one card per row with what is wrong and the fields that can put it
 * right. Edits are kept here until Save fixes; Cancel throws them away. A date that is not on the
 * calendar comes with the dates it was probably meant to be.
 */
export function FixRecordsDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {/* Mounted only while open, so every opening starts from the rows as they are */}
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <FixForm {...props} />
      </DialogContent>
    </Dialog>
  );
}

function FixForm({ onOpenChange, rows, fixing, serverErrors, onSave }: Props) {
  const [draft, setDraft] = useState<RowFixes>({});
  const [excluded, setExcluded] = useState<number[]>([]);

  // The batch as it would be if Save were pressed now
  const merged = useMemo(
    () => rows.map((r) => (draft[r.sourceRow] ? { ...r, fields: { ...r.fields, ...draft[r.sourceRow] } } : r)).map((r) => (excluded.includes(r.sourceRow) ? { ...r, removed: true } : r)),
    [rows, draft, excluded]
  );
  const byRow = useMemo(() => new Map(merged.map((r) => [r.sourceRow, r])), [merged]);
  const index = useMemo(() => duplicateIndex(merged), [merged]);
  const cards = fixing.map((n) => byRow.get(n)).filter((r): r is ReviewRow => Boolean(r));
  const open = cards.filter((r) => !r.removed && issuesOf(r, merged, serverErrors, index).errors.length > 0).length;

  const patch = (sourceRow: number, change: Partial<ReviewFields>) =>
    setDraft((d) => ({ ...d, [sourceRow]: { ...d[sourceRow], ...change } }));

  const save = () => {
    onSave(draft, excluded);
    onOpenChange(false);
  };

  return (
    <>
      <DialogHeader className="gap-0.5 border-b border-border px-6 pt-5 pb-4 pr-14">
        <p className="type-body-m-xxs tracking-wide text-muted uppercase">
          Fix records · {cards.length} of {rows.length} rows
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DialogTitle className="type-head-sb-4">Fix records before import</DialogTitle>
          <Badge variant={open > 0 ? "danger" : "success"}>
            {open > 0 ? `${open} ${open === 1 ? "issue" : "issues"}` : "All fixed"}
          </Badge>
        </div>
        <DialogDescription className="sr-only">Correct each record below, then save your fixes. Nothing changes until you save.</DialogDescription>
      </DialogHeader>

      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
        {cards.length === 0 && <p className="py-8 text-center type-body-r-s text-muted">Nothing to fix.</p>}
        {cards.map((row) => (
          <FixCard
            key={row.sourceRow}
            row={row}
            all={merged}
            index={index}
            serverErrors={serverErrors}
            onChange={(change) => patch(row.sourceRow, change)}
            onExclude={() => setExcluded((x) => [...x, row.sourceRow])}
            onRestore={() => setExcluded((x) => x.filter((n) => n !== row.sourceRow))}
          />
        ))}
        <p className="px-1 type-body-r-xs text-muted">Excluded rows are kept in the Excluded tab and in your original file. They are never silently removed.</p>
      </div>

      <DialogFooter className="items-center border-t border-border px-6 py-4 sm:justify-between">
        <p className="type-body-r-xs text-muted">Changes apply to this import only.</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save fixes</Button>
        </div>
      </DialogFooter>
    </>
  );
}

function FixCard({ row, all, index, serverErrors, onChange, onExclude, onRestore }: {
  row: ReviewRow;
  all: ReviewRow[];
  index: ReadonlyMap<string, number>;
  serverErrors: ReadonlyMap<number, FieldIssue[]>;
  onChange: (change: Partial<ReviewFields>) => void;
  onExclude: () => void;
  onRestore: () => void;
}) {
  const { errors } = issuesOf(row, all, serverErrors, index);
  const at = (field: FieldIssue["field"]) => errors.find((e) => e.field === field)?.message;
  const state = rowState(row, all, serverErrors, index);
  const raw = String(row.details.rawPostDate ?? "");
  // Suggest only while the date is still the file's unreadable one
  const suggestion = !row.fields.postDate && raw ? suggestDates(raw) : null;
  const title = row.fields.title.trim();

  if (row.removed) {
    return (
      <section aria-label={`Row ${row.sourceRow}, excluded`} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="truncate type-body-m-s text-muted">{title || "Untitled"}</p>
          <p className="type-body-r-xs text-muted">Row {row.sourceRow} · Excluded from this import</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onRestore}>
          Include again
        </Button>
      </section>
    );
  }

  const fixed = errors.length === 0;
  return (
    <section
      aria-label={`Row ${row.sourceRow}`}
      className={cn("rounded-2xl border p-4", fixed ? "border-green-200 bg-green-50/50" : "border-brand-400 bg-brand-50")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate type-body-sb-m">{title || "Untitled"}</p>
          <p className={cn("type-body-r-xs", fixed ? "text-green-700" : "text-red-600")}>
            Row {row.sourceRow} · {fixed ? "Looks good now" : state.label}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="shrink-0 text-red-600 hover:text-red-600" onClick={onExclude}>
          Exclude row
        </Button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FormField label="Content title" error={at("title")} className="sm:col-span-2">
          {(c) => <Input {...c} value={row.fields.title} maxLength={250} onChange={(e) => onChange({ title: e.target.value })} />}
        </FormField>

        <FormField label="Channel" error={at("platforms")}>
          {(c) => (
            <ToggleGroup
              type="multiple"
              size="lg"
              aria-label={`Channel for row ${row.sourceRow}`}
              aria-invalid={c["aria-invalid"]}
              aria-describedby={c["aria-describedby"]}
              value={row.fields.platforms}
              onValueChange={(v) => onChange({ platforms: IMPORT_PLATFORMS.filter((p) => v.includes(p)) })}
            >
              {IMPORT_PLATFORMS.map((p) => (
                <ToggleGroupItem key={p} value={p} aria-invalid={Boolean(at("platforms")) && !row.fields.platforms.includes(p) ? true : undefined}>
                  {platformLabel(p)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        </FormField>

        <FormField label="Publish date" error={at("postDate")}>
          <div className={cn(at("postDate") && "[&_button]:border-red-400")}>
            <DatePicker value={row.fields.postDate} onChange={(v) => onChange({ postDate: v })} placeholder="Pick a date" />
          </div>
        </FormField>
      </div>

      {suggestion && (
        <div className="mt-2 flex flex-wrap items-center gap-2 type-body-r-xs text-red-600">
          <CircleAlertIcon aria-hidden="true" className="size-4" />
          <span>{suggestion.note} Suggested:</span>
          {suggestion.dates.map((d) => (
            <Button key={d} variant="secondary" size="sm" className="rounded-full" onClick={() => onChange({ postDate: d })}>
              {formatPlanDate(d)}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
