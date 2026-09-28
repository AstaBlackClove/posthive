/**
 * migrate-supabase-to-r2.mjs
 *
 * Copies all files from Supabase Storage → Cloudflare R2, then updates DB URLs.
 * Does NOT delete from Supabase — verify R2 works first, then empty bucket manually.
 *
 * Usage:
 *   node scripts/migrate-supabase-to-r2.mjs             (live run)
 *   node scripts/migrate-supabase-to-r2.mjs --dry-run   (preview only, no writes)
 */

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env
const envLines = readFileSync(resolve(process.cwd(), ".env"), "utf8").split("\n");
for (const line of envLines) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const idx = t.indexOf("=");
  if (idx === -1) continue;
  const key = t.slice(0, idx).trim();
  const val = t.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
  if (!process.env[key]) process.env[key] = val;
}

const DRY_RUN = process.argv.includes("--dry-run");
const DB_ONLY = process.argv.includes("--db-only");
if (DRY_RUN) console.log("DRY RUN — no writes\n");
if (DB_ONLY) console.log("DB ONLY — skipping file uploads, updating DB refs only\n");

const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "media";
const SUPABASE_PUBLIC_BASE = `${process.env.SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}`;
const R2_BUCKET = process.env.R2_BUCKET ?? "posthive-uploads";
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const prisma = new PrismaClient();

function mime(path) {
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".png"))  return "image/png";
  if (path.endsWith(".gif"))  return "image/gif";
  if (path.endsWith(".mp4"))  return "video/mp4";
  if (path.endsWith(".mov"))  return "video/quicktime";
  return "image/jpeg";
}

async function listFiles() {
  const files = [];
  for (const folder of ["", "profile-pics"]) {
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .list(folder, { limit: 1000 });
    if (error) { console.warn(`list "${folder}" failed:`, error.message); continue; }
    for (const item of data ?? []) {
      if (item.id) files.push(folder ? `${folder}/${item.name}` : item.name);
    }
  }
  return files;
}

async function main() {
  console.log("Listing Supabase files...");
  const files = await listFiles();
  console.log(`Found ${files.length} files in bucket "${SUPABASE_BUCKET}"\n`);

  const urlMap = new Map(); // oldSupabaseUrl → newR2Url
  let ok = 0, fail = 0;

  for (const key of files) {
    const oldUrl = `${SUPABASE_PUBLIC_BASE}/${key}`;
    const newUrl = `${R2_PUBLIC_URL}/${key}`;

    if (DB_ONLY) {
      urlMap.set(oldUrl, newUrl);
      continue;
    }

    process.stdout.write(`  ${key} ... `);

    if (DRY_RUN) {
      console.log(`[dry] → ${newUrl}`);
      urlMap.set(oldUrl, newUrl);
      continue;
    }

    try {
      const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(key);
      if (error) throw new Error(error.message);
      const buf = Buffer.from(await data.arrayBuffer());

      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: new Uint8Array(buf),
        ContentType: mime(key),
      }));

      urlMap.set(oldUrl, newUrl);
      console.log(`✓ ${buf.length} bytes`);
      ok++;
    } catch (e) {
      console.log(`✗ ${e.message}`);
      fail++;
    }
  }

  if (!DB_ONLY) {
    console.log(`\nUploaded: ${ok}, Failed: ${fail}`);
    if (fail > 0) {
      console.log("Fix failures then re-run before updating DB.");
      await prisma.$disconnect();
      process.exit(1);
    }
  } else {
    console.log(`Mapped ${urlMap.size} URL(s) for DB update (no uploads)\n`);
  }

  if (urlMap.size === 0) {
    console.log("Nothing to update.");
    await prisma.$disconnect();
    return;
  }

  console.log("\nUpdating DB references...");

  // 1. Account.avatarUrl
  const accounts = await prisma.account.findMany({
    where: { avatarUrl: { contains: SUPABASE_PUBLIC_BASE } },
    select: { id: true, avatarUrl: true },
  });
  console.log(`  Account.avatarUrl: ${accounts.length} rows`);
  for (const a of accounts) {
    const newUrl = urlMap.get(a.avatarUrl);
    if (!newUrl) continue;
    if (!DRY_RUN) await prisma.account.update({ where: { id: a.id }, data: { avatarUrl: newUrl } });
    console.log(`    [${a.id}] updated`);
  }

  // 2. PostJob.content JSON string
  const jobs = await prisma.postJob.findMany({
    where: { content: { contains: SUPABASE_PUBLIC_BASE } },
    select: { id: true, content: true },
  });
  console.log(`  PostJob.content: ${jobs.length} rows`);
  for (const j of jobs) {
    let c = j.content;
    let changed = false;
    for (const [o, n] of urlMap) {
      if (c.includes(o)) { c = c.replaceAll(o, n); changed = true; }
    }
    if (changed) {
      if (!DRY_RUN) await prisma.postJob.update({ where: { id: j.id }, data: { content: c } });
      console.log(`    [${j.id}] updated`);
    }
  }

  // 3. LibraryItem.mediaUrls JSON array
  const libItems = await prisma.libraryItem.findMany({
    where: { mediaUrls: { string_contains: SUPABASE_PUBLIC_BASE } },
    select: { id: true, mediaUrls: true },
  });
  console.log(`  LibraryItem.mediaUrls: ${libItems.length} rows`);
  for (const item of libItems) {
    let json = JSON.stringify(item.mediaUrls);
    let changed = false;
    for (const [o, n] of urlMap) {
      if (json.includes(o)) { json = json.replaceAll(o, n); changed = true; }
    }
    if (changed) {
      if (!DRY_RUN) await prisma.libraryItem.update({ where: { id: item.id }, data: { mediaUrls: JSON.parse(json) } });
      console.log(`    [${item.id}] updated`);
    }
  }

  // 4. Upload table
  const uploads = await prisma.upload.findMany({
    where: { url: { contains: SUPABASE_PUBLIC_BASE } },
    select: { id: true, url: true },
  });
  console.log(`  Upload.url: ${uploads.length} rows`);
  for (const u of uploads) {
    const newUrl = urlMap.get(u.url);
    if (!newUrl) continue;
    if (!DRY_RUN) await prisma.upload.update({ where: { id: u.id }, data: { url: newUrl } });
    console.log(`    [${u.id}] updated`);
  }

  console.log("\nMigration complete!");
  console.log("Supabase files NOT deleted — verify R2 URLs load correctly, then empty the bucket from Supabase dashboard.");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Fatal:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
