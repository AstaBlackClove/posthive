"use client";

import { CheckIcon, CircleAlertIcon, TableIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InlineAlert } from "@/components/InlineAlert";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/cn";
import {
  FIELDS,
  assignField,
  columnStatus,
  dataChecks,
  fieldChecks,
  fieldLabel,
  mappingChanged,
  summarizeMapping,
  type ColumnMapping,
  type ColumnStatus,
  type FileColumn,
  type PlanningField,
} from "@/lib/import-mapping";
import type { ServerRow } from "@/lib/importReview";

// Radix Select cannot hold "" as a value, so "don't import" has a word of its own
const SKIP = "__skip__";

const STATUS: Record<ColumnStatus, { label: string; variant: "success" | "danger" | "default"; dot: string }> = {
  matched: { label: "Matched", variant: "success", dot: "bg-green-600" },
  "needs-mapping": { label: "Needs mapping", variant: "danger", dot: "bg-red-500" },
  skipped: { label: "Skipped", variant: "default", dot: "bg-neutral-500" },
};

type Props = {
  fileName: string;
  rowCount: number;
  columns: FileColumn[];
  /** What the user changed from the importer's guess. */
  overrides: ColumnMapping;
  onChange: (next: ColumnMapping) => void;
  /** The rows of the last preview, for "Data checks". */
  rows: ServerRow[];
  onReplaceFile: () => void;
};

/** Step 2: every column of the file, a sample, and which field it is read as. */
export function MappingStep({ fileName, rowCount, columns, overrides, onChange, rows, onReplaceFile }: Props) {
  const summary = summarizeMapping(columns, overrides);
  const checks = fieldChecks(columns, overrides);
  const found = dataChecks(rows);
  const changed = mappingChanged(columns, overrides);

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-labelledby="mapping-title" className="min-w-0 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="mapping-title" className="type-body-sb-l">
              Column mapping
            </h2>
            <p className="truncate type-body-r-xs text-muted">
              From {fileName} · {rowCount} {rowCount === 1 ? "row" : "rows"} · {columns.length} {columns.length === 1 ? "column" : "columns"}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onReplaceFile}>
            Replace file
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-bg px-4 py-3">
          <TableIcon aria-hidden="true" className="size-5 shrink-0 text-neutral-600" />
          <p className="flex-1 type-body-r-xs text-fg">
            {summary.matched} matched · {summary.needsMapping} {summary.needsMapping === 1 ? "needs" : "need"} your input · {summary.skipped} skipped
          </p>
          <Badge variant={summary.missingRequired.length === 0 ? "success" : "danger"}>
            Required {summary.requiredMapped}/{summary.requiredTotal} mapped
          </Badge>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          <div role="row" aria-hidden="true" className="hidden grid-cols-[minmax(7rem,1fr)_minmax(8rem,1.1fr)_minmax(12rem,1.4fr)_5.5rem_8rem] items-center gap-3 bg-bg px-4 py-2.5 type-body-sb-xs text-muted md:grid">
            <span>Your column</span>
            <span>Sample value</span>
            <span>{BRAND.name} field</span>
            <span>Field type</span>
            <span>Status</span>
          </div>
          <ul>
            {columns.map((column) => {
              const status = columnStatus(column, overrides);
              const field = column.index in overrides ? overrides[column.index] : column.field;
              const required = field ? FIELDS.find((f) => f.field === field)?.required : undefined;
              const view = STATUS[status];
              const id = `map-${column.index}`;
              return (
                <li
                  key={column.index}
                  className={cn(
                    "grid gap-2 border-t border-border px-4 py-3 first:border-t-0 md:grid-cols-[minmax(7rem,1fr)_minmax(8rem,1.1fr)_minmax(12rem,1.4fr)_5.5rem_8rem] md:items-center md:gap-3",
                    status === "needs-mapping" && "bg-brand-50"
                  )}
                >
                  <div className="min-w-0">
                    <p id={`${id}-name`} className="truncate type-body-sb-s">{column.label}</p>
                  </div>
                  <p className="min-w-0 truncate type-body-r-xs text-muted" title={column.sample}>
                    <span className="mr-1 type-body-sb-xs md:hidden">Sample:</span>
                    {column.sample || "—"}
                  </p>
                  <Select
                    // "" shows the placeholder and keeps the select controlled (undefined would switch it to uncontrolled)
                    value={field ?? ""}
                    onValueChange={(v) => onChange(assignField(columns, overrides, column.index, v === SKIP ? null : (v as PlanningField)))}
                  >
                    <SelectTrigger id={id} aria-labelledby={`${id}-name`} className={cn(status === "skipped" && "text-muted")}>
                      <SelectValue placeholder={status === "skipped" ? "Don't import" : "Choose a field"} />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELDS.map((f) => (
                        <SelectItem key={f.field} value={f.field}>
                          {f.label}
                        </SelectItem>
                      ))}
                      <SelectItem value={SKIP}>Don&apos;t import</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="md:justify-self-start">
                    {required !== undefined ? <Badge variant={required ? "brand" : "default"}>{required ? "Required" : "Optional"}</Badge> : <span aria-hidden="true" className="text-muted">—</span>}
                  </span>
                  <span>
                    <Badge variant={view.variant} className="gap-1.5">
                      <span aria-hidden="true" className={cn("size-1.5 rounded-full", view.dot)} />
                      {view.label}
                    </Badge>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="flex min-w-0 flex-col gap-4">
        <section aria-labelledby="validation-title" className="rounded-2xl border border-border bg-surface p-5">
          <h2 id="validation-title" className="type-body-sb-l">
            Mapping validation
          </h2>
          <p className="type-body-r-xs text-muted">Required {BRAND.name} fields must be mapped before you continue.</p>
          <ul className="mt-3 space-y-2">
            {checks.map((check) => (
              <li key={check.field} className="flex items-center gap-2 type-body-r-xs">
                <span
                  aria-hidden="true"
                  className={cn("flex size-4 shrink-0 items-center justify-center rounded-full text-white", check.column ? "bg-green-600" : check.required ? "bg-red-500" : "bg-brand-600")}
                >
                  {check.column ? <CheckIcon className="size-3" /> : <span className="size-1.5 rounded-full bg-white" />}
                </span>
                <span className="flex-1 type-body-m-xs text-fg">{check.label}</span>
                <span className={cn("truncate", check.column ? "text-muted" : "text-red-600")}>{check.column ? `← ${check.column}` : "Not mapped"}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="checks-title" className="rounded-2xl border border-border bg-surface p-5">
          <h2 id="checks-title" className="type-body-sb-l">
            Data checks
          </h2>
          {summary.missingRequired.length > 0 ? (
            <p className="mt-1 type-body-r-xs text-muted">Map the required fields to scan your rows.</p>
          ) : (
            <>
              <p className="type-body-r-xs text-muted">
                We scanned all {rowCount} {rowCount === 1 ? "row" : "rows"}. Fix these in the next step; nothing is discarded.
              </p>
              {changed && <p className="mt-2 type-body-r-xs text-brand-800">The mapping changed. These checks update when you continue.</p>}
              {found.length === 0 ? (
                <p className="mt-3 flex items-center gap-2 type-body-r-xs text-green-700">
                  <CheckIcon aria-hidden="true" className="size-4" /> No problems found.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {found.map((check) => (
                    <li
                      key={check.kind}
                      className={cn("rounded-xl border px-3 py-2", check.tone === "danger" ? "border-red-200 bg-red-50" : "border-brand-400 bg-brand-100")}
                    >
                      <p className={cn("type-body-sb-xs", check.tone === "danger" ? "text-red-600" : "text-brand-800")}>{check.title}</p>
                      <p className="type-body-r-xs text-muted">{check.example}</p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        {summary.needsMapping > 0 && summary.missingRequired.length === 0 && (
          <InlineAlert tone="warning" icon={<CircleAlertIcon />} title={`${summary.needsMapping} ${summary.needsMapping === 1 ? "column needs" : "columns need"} your input`}>
            Pick a field for {summary.needsMapping === 1 ? "it" : "each"}, or choose &quot;Don&apos;t import&quot;. A column you leave alone is not imported.
          </InlineAlert>
        )}
        {summary.missingRequired.length > 0 && (
          <InlineAlert tone="danger" title="Required fields are not mapped">
            Choose a column for {summary.missingRequired.map(fieldLabel).join(", ")}.
          </InlineAlert>
        )}
      </div>
    </div>
  );
}
