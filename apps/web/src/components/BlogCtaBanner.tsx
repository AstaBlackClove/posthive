import Link from "next/link";

export function BlogCtaBanner() {
  return (
    <div className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-r-xl border-l-3 border-accent bg-brand-100 px-4.5 py-3.5">
      <div>
        <p className="mb-0.5 type-body-sb-s text-fg">
          Try Posthive free — no credit card required
        </p>
        <p className="type-body-r-s text-muted">
          14 platforms, flat pricing, 14-day trial.
        </p>
      </div>
      <Link href="/register" className="btn-primary shrink-0 whitespace-nowrap">
        Start free →
      </Link>
    </div>
  );
}
