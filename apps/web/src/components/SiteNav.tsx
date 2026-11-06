import Link from "next/link";
import { Wordmark } from "./Wordmark";

// Simple top bar for content pages (blog, privacy, terms).
// Landing / features / platforms use the full LandingNav instead.

const LINKS = [
  { href: "/blog", label: "Blog" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
];

export function SiteNav() {
  return (
    <nav className="sticky top-0 z-50 flex h-16 items-center justify-between gap-4 border-b border-border bg-bg/90 px-5 backdrop-blur md:px-8">
      <Link href="/" className="flex items-center gap-2.5 text-fg">
        <Wordmark size="md" />
      </Link>
      <div className="flex items-center gap-5">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hidden type-body-r-s text-muted transition-colors hover:text-fg sm:inline">
            {l.label}
          </Link>
        ))}
        <Link href="/register" className="btn-primary">Get started</Link>
      </div>
    </nav>
  );
}
