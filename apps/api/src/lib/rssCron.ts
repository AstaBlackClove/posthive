/**
 * RSS cron — fires every 20 minutes.
 *
 * For each active/exhausted RSS-sourced ContentLibrary:
 *   1. Fetch and parse the feed.
 *   2. Skip items already turned into a LibraryItem (tracked in RssFeedItem by guid).
 *   3. Turn up to RSS_BATCH new items into LibraryItem rows (oldest-first), optionally
 *      summarized with Claude Haiku, with the article link always appended.
 *   4. Reactivate the library if it had gone "exhausted" — RSS libraries self-refill.
 *
 * Safety:
 *   - isRunning flag prevents overlapping runs.
 *   - RSS_BATCH caps how many articles one poll ingests, so a feed with a big
 *     backlog (first connect) doesn't flood the library in one shot.
 *   - isSsrfBlocked guards the user-supplied feed URL, same as other user-URL inputs.
 */

import Parser from "rss-parser";
import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/node";
import { prisma } from "./prisma.js";
import { isSsrfBlocked } from "./ssrf.js";

const INTERVAL_MS = 20 * 60 * 1000; // 20 minutes
const RSS_BATCH = 20; // max new articles ingested per library per poll
const parser = new Parser();

let isRunning = false;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function summarize(title: string, body: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return title;
  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `Summarize this article into a short social media caption (max 2 sentences). No hashtags, no em dashes, no quotation marks around the output. Just the caption text.\n\nTitle: ${title}\n\nContent: ${body.slice(0, 3000)}`,
      }],
    });
    const result = message.content[0];
    return result.type === "text" ? result.text.trim() : title;
  } catch (err) {
    console.warn("[rss-cron] summarize failed, falling back to title:", err);
    return title;
  }
}

async function processLibrary(lib: { id: string; rssUrl: string | null; aiSummarize: boolean; status: string }) {
  if (!lib.rssUrl || isSsrfBlocked(lib.rssUrl)) return;

  let feedItems: Array<{ guid?: string; link?: string; title?: string; contentSnippet?: string; content?: string }>;
  try {
    const feed = await parser.parseURL(lib.rssUrl);
    feedItems = feed.items ?? [];
  } catch (err) {
    console.warn(`[rss-cron] library ${lib.id} — feed fetch/parse failed:`, err);
    return;
  }

  if (!feedItems.length) return;

  const guids = feedItems.map((i) => i.guid ?? i.link ?? "").filter(Boolean);
  const seen = await prisma.rssFeedItem.findMany({
    where: { libraryId: lib.id, guid: { in: guids } },
    select: { guid: true },
  });
  const seenSet = new Set(seen.map((s) => s.guid));

  const unseen = feedItems
    .filter((i) => (i.guid ?? i.link ?? "") && !seenSet.has(i.guid ?? i.link ?? ""))
    .slice(0, RSS_BATCH);

  if (!unseen.length) return;

  const [maxOrderResult, library] = await Promise.all([
    prisma.libraryItem.aggregate({ where: { libraryId: lib.id }, _max: { order: true } }),
    prisma.contentLibrary.findUniqueOrThrow({ where: { id: lib.id }, select: { workspaceId: true } }),
  ]);
  let nextOrder = (maxOrderResult._max.order ?? -1) + 1;
  const workspaceId = library.workspaceId;

  let added = 0;
  for (const item of unseen.reverse()) { // oldest-of-the-batch first
    const guid = item.guid ?? item.link ?? "";
    const link = item.link ?? "";
    const title = item.title ?? "";
    const body = stripHtml(item.content ?? item.contentSnippet ?? "");

    try {
      const caption = lib.aiSummarize ? await summarize(title, body) : (title || body.slice(0, 200));
      const text = link ? `${caption}\n\n${link}` : caption;

      await prisma.$transaction([
        prisma.libraryItem.create({
          data: { libraryId: lib.id, workspaceId, text, order: nextOrder, status: "queued" },
        }),
        prisma.rssFeedItem.create({ data: { libraryId: lib.id, guid } }),
      ]);
      nextOrder++;
      added++;
    } catch (err) {
      // Unique constraint race (another instance already recorded this guid) — safe to skip.
      console.warn(`[rss-cron] library ${lib.id} — item skipped:`, err);
    }
  }

  if (added > 0 && lib.status === "exhausted") {
    await prisma.contentLibrary.update({ where: { id: lib.id }, data: { status: "active" } });
  }
  if (added > 0) console.log(`[rss-cron] library ${lib.id} — added ${added} new item(s)`);
}

export async function runRssCronNow(): Promise<void> {
  if (isRunning) {
    console.log("[rss-cron] previous run still in progress — skipping");
    return;
  }
  isRunning = true;
  try {
    const libraries = await prisma.contentLibrary.findMany({
      where: { sourceType: "rss", status: { in: ["active", "exhausted"] } },
      select: { id: true, rssUrl: true, aiSummarize: true, status: true },
    });
    for (const lib of libraries) {
      await processLibrary(lib).catch((err) => {
        console.error(`[rss-cron] error processing library ${lib.id}:`, err);
        Sentry.captureException(err, { tags: { component: "rss-cron", libraryId: lib.id } });
      });
    }
  } finally {
    isRunning = false;
  }
}

export function startRssCron(): void {
  setInterval(() => runRssCronNow().catch((e) => console.error("[rss-cron] error:", e)), INTERVAL_MS);
  console.log(`[rss-cron] started — every ${INTERVAL_MS / 60000} minutes`);
}
