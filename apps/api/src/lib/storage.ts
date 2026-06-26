/**
 * Storage abstraction for uploaded media files.
 *
 * SaaS upgrade path:
 *   - Swap LocalDiskStorage for an S3Storage or R2Storage implementation
 *   - No changes needed in routes or adapters — they only call upload() / getBuffer()
 *   - When auth lands, pass userId into upload() to scope paths per user
 *
 * Bluesky limits (most restrictive — good baseline for all platforms):
 *   - Max 4 images per post
 *   - Max 1 MB per image
 *   - Accepted types: image/jpeg, image/png, image/gif, image/webp
 */

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const MAX_IMAGE_SIZE_BYTES = 1_000_000; // 1 MB — Bluesky hard limit
export const MAX_IMAGES_PER_POST = 4;

const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

export interface StorageAdapter {
  /**
   * Persist a file and return a URL the client and job runner can use.
   * For local disk: a path served by GET /uploads/:filename
   * For S3/R2: a signed or public object URL
   */
  upload(buffer: Buffer, mimeType: string): Promise<string>;

  /** Read a file back as a Buffer so adapters can upload it to platforms. */
  getBuffer(url: string): Promise<Buffer>;
}

export class LocalDiskStorage implements StorageAdapter {
  constructor(private readonly uploadsDir: string) {}

  async upload(buffer: Buffer, mimeType: string): Promise<string> {
    await fs.mkdir(this.uploadsDir, { recursive: true });

    const ext = EXT_MAP[mimeType] ?? ".bin";
    const filename = `${crypto.randomUUID()}${ext}`;
    const filepath = path.join(this.uploadsDir, filename);
    await fs.writeFile(filepath, buffer);

    // Return a relative URL — the API serves /uploads/* as static files
    return `/uploads/${filename}`;
  }

  async getBuffer(url: string): Promise<Buffer> {
    // Strip the leading /uploads/ to get the filename
    const filename = path.basename(url);
    const filepath = path.join(this.uploadsDir, filename);
    return fs.readFile(filepath);
  }
}

// TODO(saas): replace with S3Storage / R2Storage:
// export class S3Storage implements StorageAdapter { ... }
