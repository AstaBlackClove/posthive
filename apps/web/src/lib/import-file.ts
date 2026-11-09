// The "Upload file" step of the plan import: what a file may be, and what the page tells the user about it.
// The limits are the API's (apps/api/src/lib/import/planningImport.ts); the server checks them again.
import { BRAND } from "./brand";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_FILE_MB = MAX_FILE_BYTES / 1024 / 1024;
export const MAX_ROWS = 1000;

export type ImportStep = "upload" | "map" | "review" | "done";

export const STEPS: ReadonlyArray<{ id: ImportStep; title: string; hint: string }> = [
  { id: "upload", title: "Upload file", hint: "Choose your file" },
  { id: "map", title: "Map columns", hint: `Match to ${BRAND.name} fields` },
  { id: "review", title: "Review & fix", hint: "Check validation" },
  { id: "done", title: "Import", hint: "Add to content list" },
];

/** What the user is told above each step. */
export const STEP_HEADINGS: Record<ImportStep, { title: string; subtitle: string }> = {
  upload: {
    title: "Import marketing plan",
    subtitle: `Bring your existing content plan into ${BRAND.name} and turn it into an organized publishing workflow.`,
  },
  map: { title: "Map your columns", subtitle: `Match the columns in your file to ${BRAND.name} fields. We matched what we could for you.` },
  review: { title: "Review & fix your rows", subtitle: "Check every record before it's added. Nothing is discarded without your say." },
  done: { title: "Import complete", subtitle: `Your plan is now in ${BRAND.name}. Here's what we added.` },
};

export function stepIndex(step: ImportStep): number {
  return STEPS.findIndex((s) => s.id === step);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Why the file cannot be used, or null. Checked before it is sent. */
export function validateImportFile(file: { name: string; size: number }): string | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xls") || name.endsWith(".xlsm")) {
    return "Old Excel files (.xls/.xlsm) aren't supported. Save the file again as .xlsx or UTF-8 CSV.";
  }
  if (!name.endsWith(".csv") && !name.endsWith(".xlsx")) return "The file must be .csv or .xlsx.";
  if (file.size === 0) return "The file is empty.";
  if (file.size > MAX_FILE_BYTES) return `The file is too large. The limit is ${MAX_FILE_MB} MB.`;
  return null;
}

/** The columns of the template (public/import-plan-template.xlsx), as the "Expected columns" card lists them. */
export const EXPECTED_COLUMNS: ReadonlyArray<{ name: string; required: boolean }> = [
  { name: "Content Title", required: true },
  { name: "Post Date", required: true },
  { name: "Platform", required: true },
  { name: "Content Pillar", required: false },
  { name: "Content Category", required: false },
  { name: "Link Copywrite", required: false },
  { name: "Caption", required: false },
  { name: "Aset Pendukung", required: false },
  { name: "PIC Content", required: false },
  { name: "Acc by", required: false },
  { name: "PIC Design", required: false },
  { name: "Progress Content", required: false },
  { name: "Link Output", required: false },
  { name: "Status", required: false },
];

/** Rows that show what a plan looks like (the template itself ships empty). */
export const EXAMPLE_ROWS: ReadonlyArray<Record<"Content Title" | "Post Date" | "Platform" | "Content Category" | "Caption", string>> = [
  { "Content Title": "5 Habits of Fast-Moving Content Teams", "Post Date": "18-11-2026", Platform: "Instagram", "Content Category": "Tips/How To", Caption: "Carousel on async approval habits" },
  { "Content Title": "Year-End Product Recap", "Post Date": "24-11-2026", Platform: "LinkedIn", "Content Category": "Product Features", Caption: "Highlights of 2026 launches" },
  { "Content Title": "Holiday Gift Guide", "Post Date": "02-12-2026", Platform: "Mirroring (LI&Ig)", "Content Category": "", Caption: "" },
];

export const FLEXIBLE_NOTE = {
  title: "Dates & channels are flexible",
  body: 'Dates like 2026-11-18 or 18/11/2026 both work. "IG", "insta" and "Instagram" are all recognised.',
};
