-- AlterTable
ALTER TABLE "PostJob" ADD COLUMN "repeatInterval" TEXT,
                      ADD COLUMN "repeatEndsAt"   TIMESTAMP(3),
                      ADD COLUMN "repeatParentId" TEXT;

-- CreateIndex
CREATE INDEX "PostJob_repeatParentId_idx" ON "PostJob"("repeatParentId");
