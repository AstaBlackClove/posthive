import sharp from "sharp";

export interface CompressOptions {
  maxBytes: number;   // hard size ceiling for the platform
  maxWidth?: number;  // longest edge cap
  maxHeight?: number;
}

const PLATFORM_LIMITS: Record<string, CompressOptions> = {
  bluesky:  { maxBytes: 976_562,  maxWidth: 2048, maxHeight: 2048 }, // ~0.95 MB (Bluesky rejects at 1 MB)
  threads:  { maxBytes: 8_000_000, maxWidth: 4096, maxHeight: 4096 },
  linkedin: { maxBytes: 5_000_000, maxWidth: 4096, maxHeight: 4096 },
};

/**
 * Compress + resize an image buffer to fit within a platform's limits.
 * Returns the original buffer unchanged if it already fits.
 */
export async function compressForPlatform(
  buffer: Buffer,
  mimeType: string,
  platform: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const opts = PLATFORM_LIMITS[platform];
  if (!opts) return { buffer, mimeType }; // unknown platform — pass through

  // Already fits — skip processing
  if (buffer.length <= opts.maxBytes && !opts.maxWidth) {
    return { buffer, mimeType };
  }

  const isGif = mimeType === "image/gif";

  // GIFs: can't compress without losing animation, just cap dimensions
  if (isGif) {
    const resized = await sharp(buffer, { animated: true })
      .resize(opts.maxWidth ?? 2048, opts.maxHeight ?? 2048, { fit: "inside", withoutEnlargement: true })
      .gif()
      .toBuffer();
    return { buffer: resized, mimeType: "image/gif" };
  }

  // For JPEG/PNG/WebP: resize first, then iteratively reduce quality until it fits
  let img = sharp(buffer).resize(
    opts.maxWidth ?? 4096,
    opts.maxHeight ?? 4096,
    { fit: "inside", withoutEnlargement: true }
  );

  // Convert PNG to JPEG for much better compression (unless it has transparency)
  const meta = await sharp(buffer).metadata();
  const hasAlpha = meta.hasAlpha && mimeType === "image/png";

  let quality = 85;
  let outputMime = hasAlpha ? "image/png" : "image/jpeg";
  let result: Buffer;

  for (let attempt = 0; attempt < 6; attempt++) {
    if (outputMime === "image/jpeg") {
      result = await img.jpeg({ quality, mozjpeg: true }).toBuffer();
    } else if (outputMime === "image/webp") {
      result = await img.webp({ quality }).toBuffer();
    } else {
      // PNG — use compressionLevel (0-9), not quality
      const level = Math.min(9, Math.floor(attempt * 1.5));
      result = await img.png({ compressionLevel: level }).toBuffer();
    }

    if (result!.length <= opts.maxBytes) break;

    // Still too big — reduce quality or switch strategy
    if (outputMime === "image/png" && result!.length > opts.maxBytes) {
      // PNG can't go smaller — convert to WebP with alpha
      outputMime = "image/webp";
      quality = 85;
    } else {
      quality = Math.max(30, quality - 15);
    }
  }

  return { buffer: result!, mimeType: outputMime };
}
