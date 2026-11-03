import Image from "next/image";
import Link from "next/link";
import { cn } from "../lib/cn";

const CATEGORY_TONE: Record<string, string> = {
  Comparison: "bg-green-50 text-green-700",
  Guide: "bg-blue-50 text-blue-700",
};

export function BlogCategoryBadge({ category, className }: { category: string; className?: string }) {
  return (
    <span className={cn("rounded-md px-2 py-0.5 type-body-sb-xs tracking-wide", CATEGORY_TONE[category] ?? "bg-brand-100 text-brand-800", className)}>
      {category}
    </span>
  );
}

// Back link, category + date, title and author row shared by every blog post.
export function BlogPostHeader({ category, date, readTime, title }: {
  category: string;
  date: string;     // "July 7, 2026"
  readTime: string; // "6 min read"
  title: React.ReactNode;
}) {
  return (
    <header>
      <Link href="/blog" className="mb-10 inline-flex items-center gap-1.5 type-body-r-s text-muted transition-colors hover:text-fg">
        ← All posts
      </Link>

      <div className="mb-5 flex flex-wrap items-center gap-2.5 type-body-r-xs text-muted">
        <BlogCategoryBadge category={category} />
        <span>{date}</span>
        <span>· {readTime}</span>
      </div>

      <h1 className="mb-6 type-head-sb-3 tracking-tight text-fg sm:type-head-sb-2">{title}</h1>

      <div className="mb-10 flex items-center gap-3 border-y border-border py-4">
        <Image src="/founder.jpg" alt="Founder" width={36} height={36} className="size-9 rounded-full object-cover" />
        <div>
          <div className="type-body-sb-s text-fg">Guna</div>
          <div className="type-body-r-xs text-muted">Founder, Posthive</div>
        </div>
      </div>
    </header>
  );
}
