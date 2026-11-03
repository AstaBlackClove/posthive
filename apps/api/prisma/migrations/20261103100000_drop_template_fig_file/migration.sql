-- Templates reference their design with a Figma link (linkUrl); the .fig upload is gone.
-- Run scripts/purge-legacy-fig-files.ts --apply BEFORE this migration: it needs these
-- columns to find the files in storage. Dropping them cannot be undone for the data.
--
-- Rollback (structure only, the values are lost):
--   ALTER TABLE "Template" ADD COLUMN "fileUrl" TEXT, ADD COLUMN "fileName" TEXT, ADD COLUMN "fileSize" INTEGER;
--   CREATE INDEX "Template_fileUrl_idx" ON "Template"("fileUrl");

DROP INDEX IF EXISTS "Template_fileUrl_idx";
ALTER TABLE "Template" DROP COLUMN IF EXISTS "fileUrl";
ALTER TABLE "Template" DROP COLUMN IF EXISTS "fileName";
ALTER TABLE "Template" DROP COLUMN IF EXISTS "fileSize";
