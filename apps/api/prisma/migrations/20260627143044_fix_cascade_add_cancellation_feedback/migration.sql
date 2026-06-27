-- DropIndex
DROP INDEX "PostJob_scheduledFor_status_idx";

-- DropIndex
DROP INDEX "PostJobTarget_postJobId_idx";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN "refreshToken" TEXT;
