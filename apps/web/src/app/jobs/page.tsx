"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDaysIcon, CloudUploadIcon, KanbanIcon, ListIcon, PlusIcon, Table2Icon } from "lucide-react";
import { ContentDrawer } from "@/components/content-list/ContentDrawer";
import { ContentListTable } from "@/components/content-list/ContentListTable";
import { DraftBanner } from "@/components/content-list/DraftBanner";
import { KanbanBoard } from "@/components/content-list/KanbanBoard";
import { ListCalendar, useCalendarPosition } from "@/components/content-list/ListCalendar";
import { SelectionBar } from "@/components/content-list/SelectionBar";
import { SourceCard } from "@/components/content-list/SourceCard";
import { StatusCounts } from "@/components/content-list/StatusCounts";
import { TopbarActions } from "@/components/dashboard/Topbar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditPostDialog } from "@/components/EditPostDialog";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { Pager } from "@/components/Pager";
import { ReviewDialog } from "@/components/ReviewDialog";
import { useToast } from "@/components/Toast";
import { TrialUrgentBanner } from "@/components/TrialUrgentBanner";
import type { Account } from "@/components/PlatformPreview";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/cn";
import { apiFetch } from "@/lib/api";
import { LIST_STATUS, filterOf, footerLine, listSubtitle, showDraftBanner, visibleFilters, type ListFilter, type ListItem, type ListView } from "@/lib/content-list";
import { wibDateKey } from "@/lib/datetime";
import {
  approveJob, deleteJob, deleteMany, fetchJob, rejectJob, retryFailed, savedMessage, submitForReview, submitMany, updateJob,
} from "@/lib/jobActions";
import type { Job } from "@/lib/jobTypes";
import { MISSING_LABEL, type MissingField } from "@/lib/submitReadiness";
import type { DesignTemplate } from "@/lib/templates";
import { useContentList } from "@/lib/useContentList";
import { usePermissions } from "@/lib/usePermissions";

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * The Content List: how many posts are in each status, the posts a page at a time, and a drawer with the whole post
 * of the row that was clicked. A quarter plan lands here as drafts; the person reads them, opens one to edit it, and
 * sends them for review.
 */
export default function ContentListPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const { canEditContent, canReview, canSubmitOwn } = usePermissions();
  const now = useMemo(() => new Date(), []);
  const todayKey = wibDateKey(now);
  const calendarPosition = useCalendarPosition(todayKey);

  const [filter, setFilter] = useState<ListFilter>("all");
  const [view, setView] = useState<ListView>("table");
  const [page, setPage] = useState(1);
  const { data, source, loading, error, reload, version } = useContentList(filter, page);

  const [openId, setOpenId] = useState<string | null>(null);
  // The rows ticked, with their status: the bar under the list offers only what each of them may do (a page turn keeps them)
  const [picked, setPicked] = useState<Map<string, ListItem>>(new Map());
  const selected = useMemo(() => new Set(picked.keys()), [picked]);
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [editing, setEditing] = useState<Job | null>(null);
  const [reviewing, setReviewing] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState<string[] | null>(null);

  useEffect(() => {
    apiFetch<Account[]>("/accounts").then(setAccounts).catch(() => {});
    // Design references for the drawer and for the edit and review dialogs
    apiFetch<{ templates: DesignTemplate[] }>("/templates").then((d) => setTemplates(d.templates)).catch(() => {});
  }, []);

  const role = { canEditContent, canReview, canSubmitOwn };
  const filters = visibleFilters(role);
  const counts = data?.counts;
  const items = data?.items ?? [];

  function pick(next: ListFilter) {
    setFilter(next);
    setPage(1);
    setPicked(new Map());
  }

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Map(prev);
      const row = items.find((i) => i.id === id);
      if (!next.delete(id) && row) next.set(id, row);
      return next;
    });
  const toggleAll = (ids: string[], on: boolean) =>
    setPicked((prev) => {
      const next = new Map(prev);
      for (const id of ids) {
        const row = items.find((i) => i.id === id);
        if (!on) next.delete(id);
        else if (row) next.set(id, row);
      }
      return next;
    });

  // Only a plain draft is sent for review: one that is in review, sent back by the reviewer (until an edit changes it),
  // scheduled, out or failed is not, so the bar does not offer to send it
  // The page's own row wins over the one kept when it was ticked: a post sent from the drawer since is in review now
  const submittable = [...picked.values()].filter((i) => filterOf(items.find((x) => x.id === i.id) ?? i) === "draft").map((i) => i.id);

  /** Open the full post in a dialog (they need its whole content, not the list's light rows). */
  async function openDialog(id: string, kind: "edit" | "review") {
    try {
      const job = await fetchJob(id);
      setOpenId(null);
      if (kind === "edit") setEditing(job);
      else setReviewing(job);
    } catch (e) {
      toastError(errorText(e));
    }
  }

  async function run(work: () => Promise<void>) {
    setBusy(true);
    try {
      await work();
    } catch (e) {
      toastError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const sendForReview = (id: string) =>
    run(async () => {
      await submitForReview(id);
      success("Sent for design review: waiting for approval.");
      setOpenId(null);
      reload();
    });

  const sendSelected = () =>
    run(async () => {
      const res = await submitMany(submittable);
      if (res.submitted.length > 0) success(`Sent ${res.submitted.length} for design review.`);
      if (res.skipped.length > 0) {
        const first = res.skipped[0];
        const why = first.missing ? `missing ${first.missing.map((m) => MISSING_LABEL[m as MissingField] ?? m).join(", ")}` : first.reason.toLowerCase();
        toastError(`Skipped ${res.skipped.length}: "${first.title}" ${why}${res.skipped.length > 1 ? " and more" : ""}.`);
      }
      setPicked(new Map());
      reload();
    });

  const retry = (id: string) =>
    run(async () => {
      await retryFailed(id);
      success("Retrying failed platforms…");
      reload();
    });

  async function confirmDelete(ids: string[]) {
    const removed = ids.length === 1 ? (await deleteJob(ids[0]), 1) : await deleteMany(ids);
    // the server skips posts that are not the person's own or are publishing right now, and still answers 200
    const skipped = "The rest are not yours, or are publishing right now.";
    if (removed === 0) toastError(`Nothing was deleted. ${skipped}`);
    else if (removed < ids.length) success(`Deleted ${removed} of ${ids.length} posts. ${skipped}`);
    else success(`Deleted ${removed} post${removed === 1 ? "" : "s"}.`);
    setPicked(new Map());
    setOpenId(null);
    reload();
  }

  const empty = !loading && !error && counts?.all === 0;
  const subtitle = counts ? listSubtitle(counts, source) : "Loading the content of your workspace…";
  const shown = filter === "all" || !counts ? counts?.all : counts[filter];

  return (
    <div className="theme-dashboard flex-1 overflow-y-auto bg-background">
      <TrialUrgentBanner />
      <div className="mx-auto flex max-w-[110rem] flex-col gap-4 p-4 pt-16 md:p-6 md:pt-6">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between xl:gap-6">
          <div className="min-w-0">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>Content workspace</BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Content List</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="mt-3 type-display-m-6 text-fg">Content List</h1>
            <p className="mt-1 max-w-4xl type-body-r-m text-fg">{subtitle}</p>
          </div>
          <TopbarActions fullName={user?.name ?? ""} avatarUrl={user?.avatarUrl} today={now} />
        </header>

        {error && (
          <InlineAlert tone="danger" title="We couldn't load your content">
            {error}{" "}
            <button type="button" onClick={reload} className="cursor-pointer underline underline-offset-2">
              Try again
            </button>
          </InlineAlert>
        )}

        {loading && !data && (
          <div className="space-y-4" aria-busy="true" aria-label="Loading the content list">
            <Skeleton className="h-20 rounded-2xl" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        )}

        {empty && (
          <Card>
            <EmptyState
              icon={<ListIcon />}
              title="No content yet"
              description="Import a quarter plan to fill this list with drafts, or write your first post."
              action={
                canEditContent && (
                  <>
                    <Button asChild variant="olive">
                      <Link href="/jobs/import">
                        <CloudUploadIcon />
                        Import plan
                      </Link>
                    </Button>
                    <Button asChild>
                      <Link href="/compose">
                        <PlusIcon />
                        Add content
                      </Link>
                    </Button>
                  </>
                )
              }
            />
          </Card>
        )}

        {data && counts && counts.all > 0 && (
          <>
            {source && <SourceCard source={source} canImport={canEditContent} />}
            <StatusCounts counts={counts} filters={filters} active={filter} onPick={pick} />
            {showDraftBanner(counts, source) && <DraftBanner />}

            <Card className="gap-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs value={filter} onValueChange={(v) => pick(v as ListFilter)} className="min-w-0 max-w-full">
                  <TabsList aria-label="Statuses" className="max-w-full flex-wrap justify-start border-0 bg-transparent p-0">
                    {(["all", ...filters] as ListFilter[]).map((f) => (
                      <TabsTrigger key={f} value={f} className="group-data-[variant=default]/tabs-list:px-4 group-data-[variant=default]/tabs-list:py-2 group-data-[variant=default]/tabs-list:data-[state=active]:bg-neutral-50 group-data-[variant=default]/tabs-list:data-[state=active]:text-fg">
                        {LIST_STATUS[f]}
                        <span className={cn("min-w-5 rounded-full px-1.5 text-center type-body-sb-xxs tabular-nums", f === "all" ? "bg-brand-500 text-neutral-950" : "bg-green-600/10 text-green-700")}>{counts[f]}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <ToggleGroup type="single" variant="pill" value={view} onValueChange={(v) => setView(v as ListView)} aria-label="View" className="shrink-0 bg-bg">
                  <ToggleGroupItem value="kanban" aria-label="Kanban view" title="Kanban view" className="px-4 py-1.5">
                    <KanbanIcon />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="table" aria-label="Table view" title="Table view" className="px-4 py-1.5">
                    <Table2Icon />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="calendar" aria-label="Calendar view" title="Calendar view" className="px-4 py-1.5">
                    <CalendarDaysIcon />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {view === "table" && (
                <>
                  {/* @container: the table drops its Link and Caption columns when this box is narrow (the drawer has both), so Status never hides behind a scroll */}
                  <div className="@container overflow-hidden rounded-xl border border-border" aria-busy={loading}>
                    <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
                      <ContentListTable
                        items={items}
                        selected={selected}
                        openId={openId}
                        selectable={canEditContent}
                        onToggle={toggle}
                        onToggleAll={toggleAll}
                        onOpen={setOpenId}
                      />
                    </div>
                    {items.length === 0 && !loading && (
                      <p className="px-4 py-10 text-center type-body-r-s text-muted-foreground">No {LIST_STATUS[filter].toLowerCase()} posts.</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 type-body-r-xs text-muted-foreground">
                    <p aria-live="polite">
                      {footerLine(items.length, shown ?? 0, filter, counts, items.some((i) => i.sourceRow !== null))}
                    </p>
                    <Pager page={data.page} pageCount={data.pageCount} onPage={setPage} />
                  </div>
                </>
              )}

              {view === "calendar" && (
                <ListCalendar filter={filter} counts={counts} position={calendarPosition} todayKey={todayKey} version={version} role={role} openId={openId} onOpen={setOpenId} />
              )}

              {view === "kanban" && (
                <KanbanBoard
                  filter={filter}
                  filters={filters}
                  counts={counts}
                  version={version}
                  openId={openId}
                  onOpen={setOpenId}
                  onMore={(f) => {
                    setView("table");
                    pick(f);
                  }}
                />
              )}
            </Card>

            {view === "table" && (canEditContent || canSubmitOwn) && (
              <SelectionBar
                count={picked.size}
                submittable={submittable.length}
                canEdit={canEditContent}
                canSubmitOwn={canSubmitOwn}
                busy={busy}
                onClear={() => setPicked(new Map())}
                onSubmit={sendSelected}
                onDelete={() => setDeleting([...picked.keys()])}
              />
            )}
          </>
        )}
      </div>

      <ContentDrawer
        id={openId}
        templates={templates}
        canEdit={canEditContent}
        canReview={canReview}
        canSubmitOwn={canSubmitOwn}
        onClose={() => setOpenId(null)}
        onEdit={(id) => openDialog(id, "edit")}
        onReview={(id) => openDialog(id, "review")}
        onSubmit={sendForReview}
        onRetry={retry}
        onDelete={(id) => setDeleting([id])}
      />

      {editing && (
        <EditPostDialog
          open
          job={editing}
          accounts={accounts}
          templates={templates}
          reviewMode={editing.status === "draft" && canSubmitOwn}
          onSave={async (text, commentText, scheduledFor, mediaUrls, accountIds, perAccount, mediaType, youtubeType, youtubeVideoMode, youtubeVideoUrl, youtubeThumbnailUrl, pixelfedSensitive, pixelfedVisibility, youtubeVisibility, youtubeTags, youtubeMadeForKids, linkedinVisibility, blueskyContentWarning, contentType, title, send) => {
            const isDraft = editing.status === "draft";
            try {
              await updateJob(editing.id, text, commentText, scheduledFor, mediaUrls, accountIds, perAccount, mediaType, youtubeType, youtubeVideoMode, youtubeVideoUrl, isDraft, canSubmitOwn, youtubeThumbnailUrl, pixelfedSensitive, pixelfedVisibility, youtubeVisibility, youtubeTags, youtubeMadeForKids, linkedinVisibility, blueskyContentWarning, contentType, title, send);
            } catch (e) {
              toastError(errorText(e));
              throw e;
            }
            success(savedMessage(isDraft, canSubmitOwn, send));
            reload();
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {reviewing && (
        <ReviewDialog
          job={reviewing}
          templates={templates}
          onClose={() => setReviewing(null)}
          onApprove={async () => {
            try {
              await approveJob(reviewing);
              success("Approved: the post is scheduled.");
              window.dispatchEvent(new CustomEvent("ph:post-scheduled"));
            } catch (e) {
              toastError(errorText(e));
              throw e;
            }
            setReviewing(null);
            reload();
          }}
          onReject={async (note) => {
            try {
              await rejectJob(reviewing, note);
              success("Rejected: sent back to the creator with your note.");
            } catch (e) {
              toastError(errorText(e));
              throw e;
            }
            setReviewing(null);
            reload();
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting && deleting.length > 1 ? `Delete ${deleting.length} posts?` : "Delete this post?"}
        description="This permanently deletes the post and cannot be undone."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await confirmDelete(deleting);
          } catch (e) {
            toastError(errorText(e));
            throw e;
          }
        }}
      />
    </div>
  );
}
