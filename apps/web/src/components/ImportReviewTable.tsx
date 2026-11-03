"use client";

import { useState } from "react";
import { cn } from "../lib/cn";
import { CATEGORIES, normalizeCategory } from "../lib/contentTypes";
import {
  IMPORT_PLATFORMS,
  MAX_TITLE,
  issuesOf,
  type FieldIssue,
  type ReviewFields,
  type ReviewRow,
} from "../lib/importReview";

const PLATFORM_LABEL: Record<string, string> = { linkedin: "LinkedIn", instagram: "Instagram", website: "Website" };

// Rows are one grid: stacked cards on a phone, table rows from md up.
// Labels show on the card and move to the column header on md.
const GRID = "md:grid md:grid-cols-[2.5rem_minmax(11rem,1.4fr)_9.5rem_11rem_minmax(9rem,1fr)_minmax(10rem,1.2fr)_6.5rem] md:items-start md:gap-3";

function Label({ children, htmlFor }: { children: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="type-body-sb-xs text-muted md:hidden">
      {children}
    </label>
  );
}

function FieldError({ id, issue }: { id: string; issue?: FieldIssue }) {
  if (!issue) return null;
  return <p id={id} className="type-body-r-xs mt-1 text-red-600">{issue.message}</p>;
}

const errorClass = "border-red-200 bg-red-50";

export function ImportReviewTable({ rows, serverErrors, accountCount, locked, onEdit, onRemove, onRestore }: {
  rows: ReviewRow[];
  /** Problems a refused commit sent back, by file row number. */
  serverErrors: ReadonlyMap<number, FieldIssue[]>;
  /** Connected accounts per platform, to warn about platforms with no account yet. */
  accountCount: Record<string, number>;
  /** True while saving or after the import finished. */
  locked: boolean;
  onEdit: (sourceRow: number, patch: Partial<ReviewFields>) => void;
  onRemove: (sourceRow: number) => void;
  onRestore: (sourceRow: number) => void;
}) {
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [showRemoved, setShowRemoved] = useState(false);

  const kept = rows.filter((r) => !r.removed);
  const removed = rows.filter((r) => r.removed);
  const checked = new Map(kept.map((r) => [r.sourceRow, issuesOf(r, rows, serverErrors)]));
  const problemCount = kept.filter((r) => (checked.get(r.sourceRow)?.errors.length ?? 0) > 0).length;
  const shown = onlyProblems ? kept.filter((r) => (checked.get(r.sourceRow)?.errors.length ?? 0) > 0) : kept;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <button type="button" className={cn("chip min-h-9", !onlyProblems && "chip-active")} aria-pressed={!onlyProblems}
          onClick={() => setOnlyProblems(false)}>
          Semua ({kept.length})
        </button>
        <button type="button" className={cn("chip min-h-9", onlyProblems && "chip-active")} aria-pressed={onlyProblems}
          onClick={() => setOnlyProblems(true)}>
          Perlu diperbaiki ({problemCount})
        </button>
      </div>

      <div role="list" aria-label="Baris yang akan diimpor">
        <div aria-hidden className={cn("hidden border-y border-border bg-surface px-4 py-2 type-body-sb-xs text-muted", GRID)}>
          <span>#</span><span>Content Title</span><span>Post Date</span><span>Platform</span><span>Category</span><span>Caption</span><span />
        </div>

        {shown.length === 0 && (
          <p className="px-4 py-8 text-center type-body-r-s text-muted">
            {onlyProblems ? "Tidak ada baris yang perlu diperbaiki." : "Semua baris sudah dihapus dari batch."}
          </p>
        )}

        {shown.map((row) => (
          <ReviewRowItem key={row.sourceRow} row={row} issues={checked.get(row.sourceRow) ?? { errors: [], warnings: [] }}
            accountCount={accountCount} locked={locked}
            onEdit={(patch) => onEdit(row.sourceRow, patch)} onRemove={() => onRemove(row.sourceRow)} />
        ))}
      </div>

      {removed.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <button type="button" onClick={() => setShowRemoved((v) => !v)} aria-expanded={showRemoved}
            className="min-h-11 type-body-sb-xs text-muted underline-offset-2 hover:underline">
            {showRemoved ? "Sembunyikan" : "Tampilkan"} baris yang dihapus atau sudah pernah diimpor ({removed.length})
          </button>
          {showRemoved && (
            <ul className="mt-2 space-y-2">
              {removed.map((row) => (
                <li key={row.sourceRow} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2">
                  <span className="type-mono-r-xs text-neutral-500">#{row.sourceRow}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate type-body-m-s text-fg">{row.fields.title || "Tanpa judul"}</p>
                    {row.duplicateReason && <p className="type-body-r-xs text-brand-800">{row.duplicateReason}</p>}
                  </div>
                  <button type="button" onClick={() => onRestore(row.sourceRow)} disabled={locked}
                    className="btn-secondary min-h-11 px-3 type-body-m-xs">
                    Kembalikan
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewRowItem({ row, issues, accountCount, locked, onEdit, onRemove }: {
  row: ReviewRow;
  issues: { errors: FieldIssue[]; warnings: string[] };
  accountCount: Record<string, number>;
  locked: boolean;
  onEdit: (patch: Partial<ReviewFields>) => void;
  onRemove: () => void;
}) {
  const id = `import-row-${row.sourceRow}`;
  const err = (field: FieldIssue["field"]) => issues.errors.find((e) => e.field === field);
  const [titleErr, dateErr, platformErr, categoryErr] = [err("title"), err("postDate"), err("platforms"), err("category")];
  const needsFix = issues.errors.length > 0;
  const rawCategory = row.fields.category?.trim() ?? "";
  const knownCategory = normalizeCategory(rawCategory);
  const noAccount = row.fields.platforms.filter((p) => p !== "website" && !accountCount[p]);

  function togglePlatform(p: string) {
    const has = row.fields.platforms.includes(p);
    onEdit({ platforms: has ? row.fields.platforms.filter((x) => x !== p) : IMPORT_PLATFORMS.filter((x) => x === p || row.fields.platforms.includes(x)) });
  }

  return (
    <div role="listitem" className={cn("border-b border-border px-4 py-4 space-y-3 md:space-y-0", GRID, needsFix && "bg-red-50/40")}>
      <div className="flex items-center justify-between md:block">
        <span className="type-mono-r-xs text-neutral-500 md:pt-2.5">#{row.sourceRow}</span>
        <span className={cn("type-body-m-xs md:hidden", needsFix ? "text-red-600" : "text-green-700")}>
          {needsFix ? "Perlu diperbaiki" : "Siap"}
        </span>
      </div>

      <div>
        <Label htmlFor={`${id}-title`}>Content Title</Label>
        <input id={`${id}-title`} value={row.fields.title} maxLength={MAX_TITLE + 50} disabled={locked}
          onChange={(e) => onEdit({ title: e.target.value })}
          aria-invalid={!!titleErr} aria-describedby={titleErr ? `${id}-title-err` : undefined}
          className={cn("field min-h-11", titleErr && errorClass)} />
        <FieldError id={`${id}-title-err`} issue={titleErr} />
      </div>

      <div>
        <Label htmlFor={`${id}-date`}>Post Date</Label>
        <input id={`${id}-date`} type="date" value={row.fields.postDate} disabled={locked}
          onChange={(e) => onEdit({ postDate: e.target.value })}
          aria-invalid={!!dateErr} aria-describedby={dateErr ? `${id}-date-err` : undefined}
          className={cn("field min-h-11", dateErr && errorClass)} />
        <FieldError id={`${id}-date-err`} issue={dateErr} />
      </div>

      <div>
        <span className="type-body-sb-xs text-muted md:hidden" id={`${id}-platform`}>Platform</span>
        <div role="group" aria-labelledby={`${id}-platform`} aria-label="Platform" className="flex flex-wrap gap-2 md:pt-0.5">
          {IMPORT_PLATFORMS.map((p) => {
            const on = row.fields.platforms.includes(p);
            return (
              <button key={p} type="button" aria-pressed={on} disabled={locked} onClick={() => togglePlatform(p)}
                className={cn("chip min-h-11 px-3 md:min-h-9", on && "chip-active", platformErr && !on && "border-red-200")}>
                {PLATFORM_LABEL[p]}
              </button>
            );
          })}
        </div>
        <FieldError id={`${id}-platform-err`} issue={platformErr} />
      </div>

      <div>
        <Label htmlFor={`${id}-category`}>Category</Label>
        <select id={`${id}-category`} value={knownCategory ?? rawCategory} disabled={locked}
          onChange={(e) => onEdit({ category: e.target.value || null })}
          aria-invalid={!!categoryErr} className="field min-h-11">
          <option value="">Pilih kategori</option>
          {rawCategory && !knownCategory && <option value={rawCategory} disabled>{rawCategory} (tidak dikenal)</option>}
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <Label htmlFor={`${id}-caption`}>Caption</Label>
        <textarea id={`${id}-caption`} value={row.fields.caption} rows={2} maxLength={10000} disabled={locked}
          onChange={(e) => onEdit({ caption: e.target.value })} className="field resize-y" />
      </div>

      <div className="flex items-center justify-between gap-2 md:flex-col md:items-end">
        <span className={cn("hidden type-body-m-xs md:inline md:pt-2.5", needsFix ? "text-red-600" : "text-green-700")}>
          {needsFix ? "Perbaiki" : "Siap"}
        </span>
        <button type="button" onClick={onRemove} disabled={locked}
          className="min-h-11 rounded-lg border border-border px-3 type-body-m-xs text-muted transition-colors hover:text-red-600 md:min-h-9">
          Hapus baris
        </button>
      </div>

      {(issues.warnings.length > 0 || noAccount.length > 0) && (
        <ul className="md:col-span-7 md:pl-13 space-y-0.5 rounded-lg border border-brand-400 bg-brand-100 px-3 py-2">
          {issues.warnings.map((w) => <li key={w} className="type-body-r-xs text-brand-800">{w}</li>)}
          {noAccount.map((p) => (
            <li key={p} className="type-body-r-xs text-brand-800">Akun {PLATFORM_LABEL[p]} belum terhubung; draft dibuat tanpa akun tujuan.</li>
          ))}
        </ul>
      )}
    </div>
  );
}
