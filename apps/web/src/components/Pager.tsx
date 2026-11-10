import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageNumbers } from "@/lib/import-rows";

type Props = {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
};

/** « 1 2 3 … 10 »: the page buttons under a table. Nothing for a list of one page. */
export function Pager({ page, pageCount, onPage }: Props) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pages" className="flex items-center gap-1">
      <Button variant="ghost" size="icon-sm" aria-label="Previous page" disabled={page === 1} onClick={() => onPage(page - 1)}>
        <ArrowLeftIcon />
      </Button>
      {pageNumbers(page, pageCount).map((n, i) =>
        n === "gap" ? (
          <span key={`gap-${i}`} aria-hidden="true" className="px-1">…</span>
        ) : (
          <Button
            key={n}
            variant={n === page ? "default" : "ghost"}
            size="icon-sm"
            aria-label={`Page ${n}`}
            aria-current={n === page ? "page" : undefined}
            onClick={() => onPage(n)}
          >
            {n}
          </Button>
        )
      )}
      <Button variant="ghost" size="icon-sm" aria-label="Next page" disabled={page === pageCount} onClick={() => onPage(page + 1)}>
        <ArrowRightIcon />
      </Button>
    </nav>
  );
}
