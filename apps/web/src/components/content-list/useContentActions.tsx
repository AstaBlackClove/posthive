"use client";

import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { ContentDrawer } from "@/components/content-list/ContentDrawer";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import type { Account } from "@/components/PlatformPreview";
import { apiFetch } from "@/lib/api";
import { filterOf } from "@/lib/content-list";
import { approveJob, deleteJob, deleteMany, fetchJob, rejectJob, retryFailed, savedMessage, submitForReview, submitMany, updateJob } from "@/lib/jobActions";
import type { Job } from "@/lib/jobTypes";
import { MISSING_LABEL, type MissingField } from "@/lib/submitReadiness";
import type { DesignTemplate } from "@/lib/templates";
import { usePermissions } from "@/lib/usePermissions";

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

// The two big dialogs (about 1,200 lines) open only after a click: loaded then, so a page that only lists posts, the
// dashboard above all, does not carry them
const EditPostDialog = lazy(() => import("@/components/EditPostDialog").then((m) => ({ default: m.EditPostDialog })));
const ReviewDialog = lazy(() => import("@/components/ReviewDialog").then((m) => ({ default: m.ReviewDialog })));

/** What the actions need to know of a row: which post it is and where it stands. The list and the dashboard each have their own row. */
export interface ActionRow {
  id: string;
  status: string;
  approvalStatus: string | null;
}

/**
 * Everything a list of posts does with a row, for the Content List and for the dashboard's table: open a post in the
 * drawer, tick rows, send them for review, delete them, edit, review, retry. `rows` are the rows on screen; `reload` asks
 * for them again after a change. `layer` is the drawer and the dialogs: render it once, anywhere in the page.
 *
 * `keepGone`: the Content List keeps a tick when its row is on another page (the person turns pages and ticks on). A list
 * that shows only its first rows, like the dashboard's, passes false: a row that is no longer listed is no longer ticked,
 * or the bar would count, and Delete would reach, a post nobody can see.
 */
export function useContentActions({ rows, reload, keepGone = true }: { rows: readonly ActionRow[]; reload: () => void; keepGone?: boolean }) {
  const { success, error: toastError } = useToast();
  const { canEditContent, canReview, canSubmitOwn } = usePermissions();

  const [openId, setOpenId] = useState<string | null>(null);
  // The rows ticked, with their status: the bar offers only what each of them may do (a page turn keeps them)
  const [picked, setPicked] = useState<Map<string, ActionRow>>(new Map());
  const selected = useMemo(() => new Set(picked.keys()), [picked]);
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [editing, setEditing] = useState<Job | null>(null);
  const [reviewing, setReviewing] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState<string[] | null>(null);

  // The accounts and the design references are for the drawer and the dialogs only: asked the first time one is wanted
  // (a page that only lists posts does not ask), and once. A failed answer leaves the list empty, as it always did.
  const lookups = useRef<Promise<unknown> | null>(null);
  function loadLookups() {
    lookups.current ??= Promise.all([
      apiFetch<Account[]>("/accounts").then(setAccounts).catch(() => {}),
      apiFetch<{ templates: DesignTemplate[] }>("/templates").then((d) => setTemplates(d.templates)).catch(() => {}),
    ]);
    return lookups.current;
  }
  useEffect(() => {
    if (openId !== null) void loadLookups();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadLookups only reads a ref
  }, [openId]);

  // A tick whose row has left the list is dropped (only for lists that show just their first rows: see `keepGone`)
  const listed = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);
  useEffect(() => {
    if (keepGone) return;
    setPicked((prev) => {
      const stay = [...prev].filter(([id]) => listed.has(id));
      return stay.length === prev.size ? prev : new Map(stay);
    });
  }, [listed, keepGone]);

  const clear = () => setPicked(new Map());
  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Map(prev);
      const row = rows.find((r) => r.id === id);
      if (!next.delete(id) && row) next.set(id, row);
      return next;
    });
  const toggleAll = (ids: string[], on: boolean) =>
    setPicked((prev) => {
      const next = new Map(prev);
      for (const id of ids) {
        const row = rows.find((r) => r.id === id);
        if (!on) next.delete(id);
        else if (row) next.set(id, row);
      }
      return next;
    });

  // Only a plain draft is sent for review: one that is in review, sent back by the reviewer (until an edit changes it),
  // scheduled, out or failed is not, so the bar does not offer to send it.
  // The page's own row wins over the one kept when it was ticked: a post sent from the drawer since is in review now.
  const submittable = [...picked.values()].filter((p) => filterOf(rows.find((r) => r.id === p.id) ?? p) === "draft").map((p) => p.id);

  /**
   * Open the full post in a dialog (they need its whole content, not the list's light rows). The editor reads the accounts
   * once, when it opens (which channels are ticked, the YouTube and Pinterest fields): it must not open before they are here.
   */
  async function openDialog(id: string, kind: "edit" | "review") {
    try {
      const [job] = await Promise.all([fetchJob(id), loadLookups()]);
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

  const submitSelected = () =>
    run(async () => {
      const res = await submitMany(submittable);
      if (res.submitted.length > 0) success(`Sent ${res.submitted.length} for design review.`);
      if (res.skipped.length > 0) {
        const first = res.skipped[0];
        const why = first.missing ? `missing ${first.missing.map((m) => MISSING_LABEL[m as MissingField] ?? m).join(", ")}` : first.reason.toLowerCase();
        toastError(`Skipped ${res.skipped.length}: "${first.title}" ${why}${res.skipped.length > 1 ? " and more" : ""}.`);
      }
      clear();
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
    clear();
    setOpenId(null);
    reload();
  }

  const layer = (
    <>
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

      {/* nothing to show while a dialog loads: it opens a moment after the click, and the drawer is still on screen */}
      <Suspense fallback={null}>
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
      </Suspense>

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
    </>
  );

  return {
    openId,
    open: setOpenId,
    selected,
    count: picked.size,
    toggle,
    toggleAll,
    clear,
    submittable: submittable.length,
    busy,
    submitSelected,
    askDeleteSelected: () => setDeleting([...picked.keys()]),
    layer,
  };
}
