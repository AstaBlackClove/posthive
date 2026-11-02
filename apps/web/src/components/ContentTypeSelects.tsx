"use client";

import { CATEGORY_INFO, PILLARS, categoriesFor, normalizeCategory, pillarFor, type Category, type Pillar } from "../lib/contentTypes";

export type ContentType = { pillar: Pillar | null; category: Category | null };

const NO_PILLAR = "__none";
const UNKNOWN = "__unknown";

function normalizePillar(raw: string | null | undefined): Pillar | null {
  const key = raw?.trim().toLowerCase();
  return PILLARS.find((p) => p.toLowerCase() === key) ?? null;
}

// Content pillar → category (docs/content-types.md). Picking a pillar narrows the
// categories; "No pillar" is Ask Me Anything. Stored values may be free text from an
// import — those show as "(unknown)" until the user picks a real one.
export function ContentTypeSelects({ pillar, category, onChange, takenCategories, idPrefix = "content-type", disabled }: {
  pillar: string | null | undefined;
  category: string | null | undefined;
  onChange: (next: ContentType) => void;
  /** Categories that already have a template — disabled (template editor). */
  takenCategories?: Set<Category>;
  idPrefix?: string;
  disabled?: boolean;
}) {
  const knownCategory = normalizeCategory(category);
  const knownPillar = knownCategory ? pillarFor(knownCategory) : normalizePillar(pillar);
  const rawCategory = category?.trim() || null;
  const rawPillar = pillar?.trim() || null;

  const pillarValue = knownCategory && knownPillar === null
    ? NO_PILLAR
    : knownPillar ?? (rawPillar ? UNKNOWN : "");
  const categoryValue = knownCategory ?? (rawCategory ? UNKNOWN : "");

  // Without a pillar every category is offered, grouped by pillar
  const groups: (Pillar | null)[] = pillarValue === NO_PILLAR ? [null] : knownPillar ? [knownPillar] : [...PILLARS, null];

  function pickPillar(value: string) {
    if (value === NO_PILLAR) return onChange({ pillar: null, category: categoriesFor(null)[0] });
    if (value === "") return onChange({ pillar: null, category: null });
    const next = value as Pillar;
    onChange({ pillar: next, category: knownCategory && pillarFor(knownCategory) === next ? knownCategory : null });
  }

  function pickCategory(value: string) {
    if (value === "") return onChange({ pillar: knownPillar, category: null });
    const next = value as Category;
    onChange({ pillar: pillarFor(next), category: next });
  }

  const label = (c: Category) => (takenCategories?.has(c) && c !== knownCategory ? `${c} (has a template)` : c);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block" htmlFor={`${idPrefix}-pillar`}>
        <span className="type-body-sb-xs text-muted">Content pillar</span>
        <select id={`${idPrefix}-pillar`} value={pillarValue} disabled={disabled}
          onChange={(e) => pickPillar(e.target.value)} className="field mt-1.5">
          <option value="">Choose a pillar</option>
          {PILLARS.map((p) => <option key={p} value={p}>{p}</option>)}
          <option value={NO_PILLAR}>No pillar (Ask Me Anything)</option>
          {pillarValue === UNKNOWN && <option value={UNKNOWN} disabled>{rawPillar} (unknown)</option>}
        </select>
      </label>
      <label className="block" htmlFor={`${idPrefix}-category`}>
        <span className="type-body-sb-xs text-muted">Content category</span>
        <select id={`${idPrefix}-category`} value={categoryValue} disabled={disabled}
          onChange={(e) => pickCategory(e.target.value)} className="field mt-1.5">
          <option value="">Choose a category</option>
          {groups.length === 1
            ? categoriesFor(groups[0]).map((c) => (
              <option key={c} value={c} disabled={takenCategories?.has(c) && c !== knownCategory}>{label(c)}</option>
            ))
            : groups.map((p) => (
              <optgroup key={p ?? "none"} label={p ?? "No pillar"}>
                {categoriesFor(p).map((c) => (
                  <option key={c} value={c} disabled={takenCategories?.has(c) && c !== knownCategory}>{label(c)}</option>
                ))}
              </optgroup>
            ))}
          {categoryValue === UNKNOWN && <option value={UNKNOWN} disabled>{rawCategory} (unknown)</option>}
        </select>
      </label>
    </div>
  );
}

/** Canonical content type from stored (possibly free-text) values; unknown values become null. */
export function toContentType(pillar: unknown, category: unknown): ContentType {
  const known = normalizeCategory(category);
  if (known) return { pillar: pillarFor(known), category: known };
  return { pillar: normalizePillar(typeof pillar === "string" ? pillar : null), category: null };
}

/** Pillar + category text for headers, e.g. "Case Study, Promotional pillar". */
export function contentTypeLabel(category: Category, pillar = CATEGORY_INFO[category].pillar): string {
  return pillar ? `${category}, ${pillar} pillar` : `${category}, no pillar`;
}
