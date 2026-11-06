import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TYPEFACE, TYPE_STYLES, WEIGHT_VALUE, typeStyleLabel } from "../../lib/typography";
import { UiShowcase } from "./UiShowcase";

export const metadata: Metadata = { title: "Typography", robots: { index: false, follow: false } };

const COLUMNS = ["Typography Type", "Typeface", "Weight", "Size", "Line Height", "Letter Spacing"];

const cell = "border-b border-border px-4 py-3 align-middle whitespace-nowrap";

/** Dev-only preview of the Body + Mono scale (src/lib/typography.ts) and of components/ui. 404 in production. */
export default function TypographyPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    // AppShell's <main> is overflow-hidden: scroll here.
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
        <h1 className="type-head-sb-4 text-fg">Typography</h1>
        <p className="mt-1 type-body-r-s text-muted">
          Body and Mono scale from Figma. Data: <code className="type-mono-r-s text-fg">src/lib/typography.ts</code>,
          checked against <code className="type-mono-r-s text-fg">app/globals.css</code> by its test. Dev only.
        </p>

        <div className="card mt-8 overflow-x-auto">
          <table className="w-full border-collapse type-body-r-s text-fg">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c} className={`${cell} text-left type-body-sb-xs text-muted`}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TYPE_STYLES.map((s) => (
                <tr key={s.className}>
                  <td className={cell}>
                    <span className={s.className}>{typeStyleLabel(s)}</span>
                    <code className="block type-mono-r-xs text-muted">{s.className}</code>
                  </td>
                  <td className={cell}>{TYPEFACE[s.variant]}</td>
                  <td className={cell}>{WEIGHT_VALUE[s.weight]}</td>
                  <td className={cell}>{s.fontSize}px</td>
                  <td className={cell}>{s.lineHeight}px</td>
                  <td className={cell}>0</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <UiShowcase />
      </div>
    </div>
  );
}
