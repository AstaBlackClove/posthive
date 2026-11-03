/**
 * Deletes the legacy .fig files that old design templates still point at, and lists the
 * templates that have no Figma link (they lose their only design reference).
 *
 * Run this BEFORE the migration 20261103100000_drop_template_fig_file, which drops the
 * fileUrl/fileName/fileSize columns this script reads. Dry run by default: nothing is
 * deleted without --apply. Deleted files cannot be restored; back up the bucket first.
 *
 * Usage (from apps/api, DATABASE_URL and STORAGE_PROVIDER set like the API):
 *   npx tsx scripts/purge-legacy-fig-files.ts            # report only
 *   npx tsx scripts/purge-legacy-fig-files.ts --apply    # delete the files
 */

import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { LocalDiskStorage, R2Storage, SupabaseStorage } from "../src/lib/storage.js";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const here = path.dirname(fileURLToPath(import.meta.url));

const storage = process.env.STORAGE_PROVIDER === "r2"
  ? new R2Storage()
  : process.env.STORAGE_PROVIDER === "supabase"
  ? new SupabaseStorage()
  : new LocalDiskStorage(path.join(here, "..", "uploads"));

async function main() {
  // Raw query: the Prisma client no longer knows these columns once the schema is updated
  const rows = await prisma.$queryRaw<Array<{
    id: string; workspaceId: string | null; category: string | null;
    fileUrl: string; fileName: string | null; linkUrl: string | null;
  }>>`SELECT "id", "workspaceId", "category", "fileUrl", "fileName", "linkUrl" FROM "Template" WHERE "fileUrl" IS NOT NULL`;

  console.log(`\n${rows.length} template(s) hold a .fig file. ${apply ? "DELETING" : "Dry run, nothing is deleted"}.\n`);
  const noLink = rows.filter((r) => !r.linkUrl);

  for (const r of rows) {
    console.log(`  ${r.id}  ws=${r.workspaceId}  ${r.category ?? "-"}  ${r.fileName ?? ""}  ${r.linkUrl ? "has link" : "NO LINK"}  ${r.fileUrl}`);
  }
  if (noLink.length > 0) {
    console.log(`\n${noLink.length} of them have no Figma link. They will show "Needs Figma link" until the design team adds one.`);
  }

  if (!apply) {
    console.log("\nRun again with --apply to delete the files.");
    return;
  }

  let deleted = 0;
  for (const r of rows) {
    try {
      await storage.delete(r.fileUrl);
      await prisma.upload.deleteMany({ where: { url: r.fileUrl } });
      deleted++;
    } catch (err) {
      console.error(`  FAILED ${r.id} ${r.fileUrl}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`\nDeleted ${deleted} of ${rows.length} file(s).`);
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
