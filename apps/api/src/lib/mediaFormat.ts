import { getMediaBuffer, type StorageAdapter } from "./storage.js";

const UNSUPPORTED_EXT = /\.(webp|gif|bmp|tiff?|avif|heic|heif)(\?.*)?$/i;
const MAX_CONVERT_BYTES = 20_000_000; // sanity cap before feeding sharp — avoid huge-image memory spikes
const HEAD_CHECK_TIMEOUT_MS = 8_000;

/**
 * HEAD-checks each media URL so a job isn't scheduled against a file that's
 * already gone (e.g. an upload the orphan-cleanup cron already deleted before
 * this job claimed it). Returns the first dead URL found, or null if all are live.
 * Same check dripCron already runs before drip-publishing a library item.
 */
export async function findDeadMediaUrl(urls: string[]): Promise<string | null> {
  const httpUrls = urls.filter((u) => u.startsWith("http"));
  const results = await Promise.all(httpUrls.map(async (url) => {
    try {
      const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(HEAD_CHECK_TIMEOUT_MS) });
      return res.ok ? null : url;
    } catch {
      return url;
    }
  }));
  return results.find((dead) => dead !== null) ?? null;
}

/**
 * Instagram, Threads, and Tumblr fetch image URLs themselves and only
 * reliably accept JPEG/PNG — WEBP/GIF/etc. get rejected with a confusing
 * platform-side error. If a URL looks unsupported, fetch it (via our own
 * storage or externally), convert the first frame to JPEG with sharp, and
 * re-host it on our storage. Already-supported URLs pass through untouched
 * — no extra fetch/upload cost for the common case.
 */
export async function ensureSupportedImageUrl(url: string, storage: StorageAdapter): Promise<string> {
  if (!UNSUPPORTED_EXT.test(url)) return url;

  // getMediaBuffer owns its own per-attempt timeout and retry on transient failures.
  const buffer = await getMediaBuffer(storage, url);

  if (buffer.length > MAX_CONVERT_BYTES) {
    throw new Error(`Media file too large to convert to a supported format (${(buffer.length / 1_000_000).toFixed(1)} MB, max 20 MB): ${url}`);
  }

  const sharp = (await import("sharp")).default;
  const jpeg = await sharp(buffer) // reads only the first frame of an animated image by default
    .flatten({ background: "#ffffff" }) // drop any alpha channel safely onto white
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  const convertedUrl = await storage.upload(jpeg, "image/jpeg", "converted");
  console.log(`[media-format] converted ${url} -> ${convertedUrl}`);
  return convertedUrl;
}

/**
 * Deletes converted-image files created by ensureSupportedImageUrl, after a
 * delay — not immediately. Instagram/Threads fetch the image synchronously
 * during container creation (confirmed by format-error timing), but we
 * can't confirm Tumblr fetches it within the single create-post call rather
 * than asynchronously afterward. A safety delay avoids a race where we
 * delete the file before the platform has actually finished fetching it.
 * Non-blocking — doesn't hold up the job that called it.
 */
export function cleanupConvertedLater(urls: string[], storage: StorageAdapter): void {
  if (!urls.length) return;
  setTimeout(() => {
    Promise.allSettled(urls.map((u) => storage.delete(u)))
      .then(() => console.log(`[media-format] cleaned up ${urls.length} converted file(s): ${urls.join(", ")}`))
      .catch(() => { /* best-effort */ });
  }, 30_000);
}
