"use client";

import { useEffect, useState } from "react";
import { CloudUploadIcon, ImageIcon } from "lucide-react";
import { DesignReferenceCard } from "@/components/DesignReferenceCard";
import { PlatformIcon } from "@/components/PlatformIcon";
import { PLATFORM_LIMIT } from "@/components/PlatformPreview";
import { StatusDot } from "@/components/dashboard/StatusDot";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch, assetUrl } from "@/lib/api";
import { cn } from "@/lib/cn";
import { normalizeCategory } from "@/lib/contentTypes";
import {
  activityText,
  approvalLabel,
  captionLimit,
  filterOf,
  longDate,
  pillOf,
  publishingLabel,
  statusOfPost,
  timeWib,
  type PostDetail,
} from "@/lib/content-list";
import { CONTENT_STATUS } from "@/lib/content-status";
import { formatPlanDate } from "@/lib/import-rows";
import { wibDateKey } from "@/lib/datetime";
import { platformLabel } from "@/lib/platforms";
import { missingMessage } from "@/lib/submitReadiness";
import { templatesByCategory, type DesignTemplate } from "@/lib/templates";
import { InfoTile } from "./InfoTile";

type Props = {
  /** The post to show; null closes the drawer. */
  id: string | null;
  templates: DesignTemplate[];
  /** Edit, delete, submit and retry are for the people who make content. */
  canEdit: boolean;
  canReview: boolean;
  /** This person sends their drafts for review (the approval flow applies to them). */
  canSubmitOwn: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onReview: (id: string) => void;
  onSubmit: (id: string) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
};

/** A chip of the header: "Content: Draft". */
function StatusChip({ status, label }: { status: Parameters<typeof StatusDot>[0]["status"]; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-bg px-2.5 py-1 type-body-sb-xxs text-fg">
      <StatusDot status={status} className="size-1.5" />
      {label}
    </span>
  );
}

/** The post of one row, read only: what it is, its caption, its design, what happened to it. Everything is edited in the full editor. */
export function ContentDrawer({ id, templates, canEdit, canReview, canSubmitOwn, onClose, onEdit, onReview, onSubmit, onRetry, onDelete }: Props) {
  const [post, setPost] = useState<PostDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");

  // The answer for the post on screen only: a slow one for a row the person already left is dropped
  useEffect(() => {
    if (!id) return;
    let live = true;
    setPost(null);
    setError(null);
    setTab("overview");
    apiFetch<PostDetail>(`/jobs/${id}/detail`)
      .then((answer) => live && setPost(answer))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Something went wrong. Try again."));
    return () => {
      live = false;
    };
  }, [id]);

  const category = post ? normalizeCategory(post.category) : null;
  const template = category ? templatesByCategory(templates).get(category) : undefined;
  const limit = post ? captionLimit(post.channels, PLATFORM_LIMIT) : null;
  const filter = post ? filterOf(post) : null;

  // Which buttons the footer has. Until the required fields are there a draft has only Close and Edit Content; once
  // they are, Submit for review and Delete appear. A post that is already in review, out or failed is past that gate.
  // A person who goes through review changes only their own posts (the server refuses the rest).
  const unsent = filter === "draft" || filter === "rejected";
  const complete = post ? post.missing.length === 0 : false;
  const mayChange = canEdit && Boolean(post && (canReview || post.mine));
  const canEditPost = mayChange && (unsent || filter === "review" || (filter === "pending" && !canSubmitOwn));
  // In review the post has been sent: nothing to submit until an edit pulls it back to a draft
  const canSubmit = mayChange && canSubmitOwn && unsent && complete;
  const canDelete = mayChange && (!unsent || complete);
  const canRetry = mayChange && filter === "failed";
  // Told only to the person who sends posts for review: why their draft has only two buttons
  const hint = post && mayChange && canSubmitOwn && unsent && !complete ? missingMessage(post.missing) : null;

  return (
    <Sheet open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" showCloseButton className="w-full gap-0 bg-surface p-0 sm:max-w-170">
        <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1 gap-0">
        <header className="space-y-2 border-b border-border px-6 pt-5 pb-0">
          {post ? (
            <>
              <p className="pr-10 type-body-r-xxs tracking-wide text-muted-foreground uppercase">
                Content detail{post.sourceRow ? ` · Row ${post.sourceRow}` : ""}
                {post.pillar ? ` · Pillar: ${post.category ?? post.pillar}` : ""}
              </p>
              <SheetTitle className="pr-10 type-head-sb-5 break-words text-fg">{post.title}</SheetTitle>
              <SheetDescription className="type-body-r-xs">
                {[
                  statusOfPost(post),
                  post.source ? `Imported from ${post.source.fileName}${post.sourceRow ? ` (row ${post.sourceRow})` : ""}` : null,
                  post.source ? formatPlanDate(wibDateKey(new Date(post.source.importedAt))) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </SheetDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <StatusChip status={pillOf(post)} label={`Content: ${statusOfPost(post)}`} />
                <StatusChip status={filter === "review" ? "review" : filter === "rejected" ? "changes" : "brief"} label={`Approval: ${approvalLabel(post)}`} />
                <StatusChip status={filter === "pending" ? "scheduled" : filter === "done" ? "published" : filter === "failed" ? "failed" : "brief"} label={`Publishing: ${publishingLabel(post)}`} />
                <span className="ml-auto flex items-center gap-1.5">
                  {post.channels.map((c) => (
                    <span key={c} title={platformLabel(c)} className="flex size-8 items-center justify-center rounded-lg bg-bg">
                      <PlatformIcon platform={c} size={18} />
                    </span>
                  ))}
                </span>
              </div>
            </>
          ) : (
            <>
              <SheetTitle className="pr-10 type-head-sb-5 text-fg">{error ? "This post can't be shown" : "Loading…"}</SheetTitle>
              <SheetDescription className="type-body-r-xs">{error ?? "Fetching the post."}</SheetDescription>
            </>
          )}

          <TabsList variant="line" className="border-b-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="design">Design{post ? ` (${post.media.length})` : ""}</TabsTrigger>
            <TabsTrigger value="activity">Activity{post ? ` (${post.activity.length})` : ""}</TabsTrigger>
          </TabsList>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 type-body-r-s text-red-600">
              {error}
            </p>
          )}
          {!post && !error && (
            <div className="space-y-3" aria-hidden="true">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {post && (
            <>
              <TabsContent value="overview" className="space-y-6">
                <section aria-labelledby="info-title">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 id="info-title" className="type-body-sb-m text-fg">Content information</h3>
                    <p className="type-body-r-xs text-muted-foreground">{post.source ? "Imported · read-only preview" : "Read-only preview"}</p>
                  </div>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    <InfoTile label="Content pillar">{post.category ?? post.pillar ?? "Not set"}</InfoTile>
                    <InfoTile label="Publishing platform">
                      {post.channels.length > 0 ? post.channels.map(platformLabel).join(" · ") : "No channel yet"}
                    </InfoTile>
                    <InfoTile label="Publishing date">{post.scheduledFor ? longDate(post.scheduledFor) : "No date yet"}</InfoTile>
                    <InfoTile label="Publishing time">{post.scheduledFor ? timeWib(post.scheduledFor) : "—"}</InfoTile>
                    <InfoTile label="Approval status">{approvalLabel(post)}</InfoTile>
                    <InfoTile label="Link copywrite">
                      {post.link ? (
                        <a href={post.link} target="_blank" rel="noopener noreferrer" className="block truncate text-brand-800 underline-offset-2 hover:underline" title={post.link}>
                          {post.link.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">{post.designCopy ? "Not a link" : "None"}</span>
                      )}
                    </InfoTile>
                  </dl>
                  {post.reviewNote && post.approvalStatus === "rejected" && (
                    <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 type-body-r-s text-red-600">
                      <span className="type-body-sb-s">Design review:</span> {post.reviewNote}
                    </p>
                  )}
                </section>

                <section aria-labelledby="caption-title">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 id="caption-title" className="type-body-sb-m text-fg">Caption</h3>
                    <p className="type-body-r-xs text-muted-foreground">
                      {post.captionLength.toLocaleString("en-US")}
                      {limit ? ` / ${limit.toLocaleString("en-US")}` : ""} characters
                    </p>
                  </div>
                  <p className={cn("mt-3 rounded-xl bg-bg px-4 py-3 type-body-r-s break-words whitespace-pre-wrap", !post.caption && "text-muted-foreground")}>
                    {post.caption || "No caption yet."}
                  </p>
                  {limit && post.captionLength > limit && (
                    <p role="status" className="mt-2 type-body-r-xs text-red-600">
                      This is {(post.captionLength - limit).toLocaleString("en-US")} characters over what {platformLabel(post.channels.find((c) => PLATFORM_LIMIT[c] === limit) ?? "")} takes.
                    </p>
                  )}
                </section>

                <DesignSection post={post} template={template} category={category} />
                <ActivitySection post={post} />
              </TabsContent>

              <TabsContent value="design" className="space-y-4">
                <DesignSection post={post} template={template} category={category} />
              </TabsContent>

              <TabsContent value="activity">
                <ActivitySection post={post} />
              </TabsContent>
            </>
          )}
        </div>

        <footer className="space-y-3 border-t border-border px-6 py-4">
          <p className="type-body-r-xs text-muted-foreground" role={hint ? "status" : undefined}>
            {hint ?? (canEdit ? "Preview only · all edits happen in the full-page editor" : "Preview only")}
          </p>
          {/* Delete stands apart on the left, away from the actions that move the post forward on the right */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {post && canDelete && (
              <Button variant="destructive-outline" className="mr-auto" onClick={() => onDelete(post.id)}>
                Delete
              </Button>
            )}
            {post && canRetry && <Button variant="secondary" className="border-neutral-500" onClick={() => onRetry(post.id)}>Retry failed</Button>}
            {post && canSubmit && <Button variant="secondary" className="border-neutral-500" onClick={() => onSubmit(post.id)}>Submit for review</Button>}
            {post && canReview && filter === "review" && <Button variant="secondary" className="border-neutral-500" onClick={() => onReview(post.id)}>Review</Button>}
            <Button variant="secondary" className="border-neutral-500" onClick={onClose}>Close</Button>
            {/* an approved post is locked for a person who goes through review: the server refuses their edit */}
            {post && canEditPost && <Button onClick={() => onEdit(post.id)}>Edit Content</Button>}
          </div>
        </footer>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function DesignSection({ post, template, category }: { post: PostDetail; template: DesignTemplate | undefined; category: ReturnType<typeof normalizeCategory> }) {
  return (
    <section aria-labelledby={`design-title-${post.id}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={`design-title-${post.id}`} className="type-body-sb-m text-fg">Design</h3>
        <p className="type-body-r-xs text-muted-foreground">Template &amp; ready design</p>
      </div>
      <div className="mt-3 space-y-3">
        {post.media.length > 0 ? (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {post.media.map((url) => (
              <li key={url} className="aspect-square overflow-hidden rounded-xl bg-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetUrl(url)} alt="" loading="lazy" className="size-full object-cover" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-dashed border-neutral-300 px-4 py-4">
            <CloudUploadIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="type-body-m-m text-fg">No template or design yet</p>
              <p className="mt-0.5 type-body-r-xs text-muted-foreground">Choose a Postly template for this pillar or upload a ready design in the full-page editor.</p>
            </div>
          </div>
        )}
        {post.media.length > 0 && (
          <p className="flex items-center gap-1.5 type-body-r-xs text-muted-foreground">
            <ImageIcon aria-hidden="true" className="size-3.5" />
            {post.media.length} {post.media.length === 1 ? "image" : "images"} attached
          </p>
        )}
        <DesignReferenceCard template={template} category={category} />
      </div>
    </section>
  );
}

function ActivitySection({ post }: { post: PostDetail }) {
  return (
    <section aria-labelledby={`activity-title-${post.id}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={`activity-title-${post.id}`} className="type-body-sb-m text-fg">Activity</h3>
        <p className="type-body-r-xs text-muted-foreground">Latest</p>
      </div>
      <ol className="mt-3 space-y-2.5">
        {[...post.activity].reverse().map((entry, i) => (
          <li key={i} className="flex items-start gap-2.5 type-body-r-s text-fg">
            <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", entry.kind === "failed" ? CONTENT_STATUS.failed.dot : entry.kind === "revision" ? CONTENT_STATUS.changes.dot : entry.kind === "approved" ? CONTENT_STATUS.approved.dot : "bg-brand-700")} />
            <span className="min-w-0 break-words">{activityText(entry, platformLabel)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
