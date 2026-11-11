"use client";

import { InlineAlert } from "@/components/InlineAlert";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { BOARD_CARDS, BOARD_CARDS_ALONE, BOARD_EMPTY, LIST_STATUS, boardFooter, type BoardFilter, type ListCounts, type ListFilter } from "@/lib/content-list";
import { useBoard } from "@/lib/useContentList";
import { PostCard } from "./PostCard";

/** The colour of a column: the line over it and the dot in its header. Written out so Tailwind sees every class. */
const TONE: Record<BoardFilter, { bar: string; dot: string }> = {
  draft: { bar: "border-t-neutral-900", dot: "bg-neutral-900" },
  review: { bar: "border-t-brand-700", dot: "bg-brand-700" },
  rejected: { bar: "border-t-red-600", dot: "bg-red-600" },
  pending: { bar: "border-t-green-600", dot: "bg-green-600" },
  done: { bar: "border-t-blue-600", dot: "bg-blue-600" },
  failed: { bar: "border-t-red-600", dot: "bg-red-600" },
};

type Props = {
  /** The tab on screen: "all" shows every column, a status only its own. */
  filter: ListFilter;
  /** The columns this role has, in order. */
  filters: BoardFilter[];
  counts: ListCounts;
  /** Changes when the list was edited: the columns ask again. */
  version: number;
  /** The post whose drawer is open. */
  openId: string | null;
  onOpen: (id: string) => void;
  /** "+ 56 more drafts": the table of that status, where the whole list can be paged and ticked. */
  onMore: (filter: BoardFilter) => void;
};

/**
 * The Kanban view: a column per status with its first cards. A card only opens the drawer; it is not dragged, because a
 * post changes status through review and approval, not by being moved. The rest of a column is in the table.
 */
export function KanbanBoard({ filter, filters, counts, version, openId, onOpen, onMore }: Props) {
  const columnsShown = filter === "all" ? filters : [filter];
  const alone = columnsShown.length === 1;
  const { columns, loading, error, retry } = useBoard(columnsShown, alone ? BOARD_CARDS_ALONE : BOARD_CARDS, version);
  const onBoard = columns ? columnsShown.reduce((n, f) => n + columns[f].items.length, 0) : 0;
  const total = columnsShown.reduce((n, f) => n + counts[f], 0);

  return (
    <div className="space-y-3">
      {error && (
        <InlineAlert tone="danger" title="We couldn't load the board">
          {error}{" "}
          <button type="button" onClick={retry} className="cursor-pointer underline underline-offset-2">
            Try again
          </button>
        </InlineAlert>
      )}

      <div aria-busy={loading} className={cn("flex snap-x gap-3 overflow-x-auto pb-2 transition-opacity", loading && columns && "opacity-60")}>
        {columnsShown.map((f) => {
          const answer = columns?.[f];
          const more = answer ? answer.total - answer.items.length : 0;
          return (
            <section
              key={f}
              aria-label={LIST_STATUS[f]}
              className={cn("flex min-h-64 flex-col gap-3 rounded-xl border-t-4 bg-bg p-3", TONE[f].bar, alone ? "w-full max-w-sm" : "w-72 shrink-0 snap-start")}
            >
              <header className="flex items-center gap-2 px-1">
                <span aria-hidden="true" className={cn("size-2 rounded-full", TONE[f].dot)} />
                <h3 className="type-body-sb-s text-fg">{LIST_STATUS[f]}</h3>
                <span className={cn("min-w-6 rounded-full px-2 text-center type-body-sb-xxs tabular-nums", counts[f] > 0 ? "bg-brand-100 text-brand-800" : "bg-neutral-100 text-muted-foreground")}>{counts[f]}</span>
              </header>

              {!answer ? (
                // placeholders only while the first answer is on its way: after a failure the error above says what happened
                loading && (
                  <div className="space-y-3" aria-hidden="true">
                    <Skeleton className="h-44 rounded-xl" />
                    <Skeleton className="h-44 rounded-xl" />
                  </div>
                )
              ) : answer.items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-5 text-center">
                  <p className="type-body-m-s text-fg">No posts yet</p>
                  <p className="mt-1 type-body-r-xs text-muted-foreground">{BOARD_EMPTY[f]}</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {answer.items.map((item) => (
                    <li key={item.id} className="flex flex-col">
                      <PostCard item={item} open={openId === item.id} onOpen={onOpen} />
                    </li>
                  ))}
                </ul>
              )}

              {more > 0 && (
                <button type="button" onClick={() => onMore(f)} className="w-fit cursor-pointer px-1 type-body-sb-xs text-brand-800 underline-offset-2 hover:underline">
                  + {more} more {f === "draft" ? (more === 1 ? "draft" : "drafts") : more === 1 ? "post" : "posts"}
                </button>
              )}
            </section>
          );
        })}
      </div>

      <p className="type-body-r-xs text-muted-foreground" aria-live="polite">
        {columns && boardFooter(onBoard, total)}
      </p>
    </div>
  );
}
