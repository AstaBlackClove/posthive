-- Design-team approval workflow
-- Workspace: approval toggle. PostJob: review state. Members: "approver" role value (string column, no ALTER needed).

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "approvalRequired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PostJob" ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT;
ALTER TABLE "PostJob" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT;
ALTER TABLE "PostJob" ADD COLUMN IF NOT EXISTS "reviewedByUserId" TEXT;
ALTER TABLE "PostJob" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "PostJob" ADD CONSTRAINT "PostJob_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PostJob_workspaceId_approvalStatus_idx" ON "PostJob"("workspaceId", "approvalStatus");
