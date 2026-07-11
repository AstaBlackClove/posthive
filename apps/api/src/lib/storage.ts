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
export const MAX_IMAGE_SIZE_BYTES = 10_000_000; // 10 MB
export const MAX_IMAGES_PER_POST = 4;

const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/mov": ".mov",
};

export interface StorageAdapter {
  /** Persist a file and return a URL the client and job runner can use. */
  upload(buffer: Buffer, mimeType: string, folder?: string): Promise<string>;

  /** Read a file back as a Buffer so adapters can upload it to platforms. */
  getBuffer(url: string): Promise<Buffer>;

  /** Delete a stored file by its URL. Called after a job posts successfully. */
  delete(url: string): Promise<void>;
}

export class LocalDiskStorage implements StorageAdapter {
  constructor(private readonly uploadsDir: string) {}

  async upload(buffer: Buffer, mimeType: string, folder?: string): Promise<string> {
    const dir = folder ? path.join(this.uploadsDir, folder) : this.uploadsDir;
    await fs.mkdir(dir, { recursive: true });
    const ext = EXT_MAP[mimeType] ?? ".bin";
    const filename = `${crypto.randomUUID()}${ext}`;
    await fs.writeFile(path.join(dir, filename), buffer);
    return folder ? `/uploads/${folder}/${filename}` : `/uploads/${filename}`;
  }

  async getBuffer(url: string): Promise<Buffer> {
    // Support both /uploads/filename and /uploads/folder/filename
    const relative = url.replace(/^\/uploads\//, "");
    const filepath = path.join(this.uploadsDir, relative);
    return fs.readFile(filepath);
  }

  async delete(url: string): Promise<void> {
    try {
      const filename = path.basename(url);
      const filepath = path.join(this.uploadsDir, filename);
      await fs.unlink(filepath);
    } catch (err: unknown) {
      // File already gone — not an error
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
}

/**
 * SupabaseStorage — swap in when AUTH_PROVIDER=supabase.
 * Uses the Supabase Storage API (S3-compatible bucket).
 *
 * Set env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_STORAGE_BUCKET (default: "uploads")
 */
export class SupabaseStorage implements StorageAdapter {
  private readonly bucket: string;
  private readonly baseUrl: string;
  private readonly serviceKey: string;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for SupabaseStorage");
    this.baseUrl = url;
    this.serviceKey = key;
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";
  }

  private storageUrl(path: string) {
    return `${this.baseUrl}/storage/v1/object/${this.bucket}/${path}`;
  }

  private headers() {
    return { Authorization: `Bearer ${this.serviceKey}`, apikey: this.serviceKey };
  }

  async upload(buffer: Buffer, mimeType: string, folder?: string): Promise<string> {
    const ext = EXT_MAP[mimeType] ?? ".bin";
    const filename = folder
      ? `${folder}/${crypto.randomUUID()}${ext}`
      : `${crypto.randomUUID()}${ext}`;
    const res = await fetch(this.storageUrl(filename), {
      method: "POST",
      headers: { ...this.headers(), "Content-Type": mimeType },
      body: new Uint8Array(buffer),
    });
    if (!res.ok) throw new Error(`Supabase upload failed: ${await res.text()}`);
    return `${this.baseUrl}/storage/v1/object/public/${this.bucket}/${filename}`;
  }

  async getBuffer(url: string): Promise<Buffer> {
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error(`Supabase getBuffer failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async delete(url: string): Promise<void> {
    // Extract the path after /object/public/{bucket}/
    const marker = `/object/public/${this.bucket}/`;
    const idx = url.indexOf(marker);
    const filePath = idx !== -1 ? url.slice(idx + marker.length) : url.split("/").pop()!;
    const res = await fetch(`${this.baseUrl}/storage/v1/object/${this.bucket}/${filePath}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok && res.status !== 404) throw new Error(`Supabase delete failed: ${await res.text()}`);
  }
}
