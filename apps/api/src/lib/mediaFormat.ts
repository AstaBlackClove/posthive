import { getMediaBuffer, type StorageAdapter } from "./storage.js";

const UNSUPPORTED_EXT = /\.(webp|gif|bmp|tiff?|avif|heic|heif)(\?.*)?$/i;
const MAX_CONVERT_BYTES = 20_000_000; // sanity cap before feeding sharp — avoid huge-image memory spikes
const FETCH_TIMEOUT_MS = 15_000;

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

  const buffer = await Promise.race([
    getMediaBuffer(storage, url),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out fetching media for format conversion: ${url}`)), FETCH_TIMEOUT_MS)
    ),
  ]);

  if (buffer.length > MAX_CONVERT_BYTES) {
    throw new Error(`Media file too large to convert to a supported format (${(buffer.length / 1_000_000).toFixed(1)} MB, max 20 MB): ${url}`);
  }

  const sharp = (await import("sharp")).default;
  const jpeg = await sharp(buffer) // reads only the first frame of an animated image by default
    .flatten({ background: "#ffffff" }) // drop any alpha channel safely onto white
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  return storage.upload(jpeg, "image/jpeg", "converted");
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
    Promise.allSettled(urls.map((u) => storage.delete(u))).catch(() => { /* best-effort */ });
  }, 30_000);
}
