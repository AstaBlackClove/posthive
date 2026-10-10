-- CreateIndex (IF NOT EXISTS — some indexes may already exist on prod)
CREATE INDEX IF NOT EXISTS "Account_workspaceId_platform_idx" ON "Account"("workspaceId", "platform");
CREATE INDEX IF NOT EXISTS "PostJob_workspaceId_status_idx" ON "PostJob"("workspaceId", "status");
CREATE INDEX IF NOT EXISTS "PostJob_workspaceId_createdAt_idx" ON "PostJob"("workspaceId", "createdAt");
CREATE INDEX IF NOT EXISTS "PostJob_workspaceId_scheduledFor_idx" ON "PostJob"("workspaceId", "scheduledFor");
CREATE INDEX IF NOT EXISTS "PostJob_workspaceId_scheduledFor_id_idx" ON "PostJob"("workspaceId", "scheduledFor", "id");
CREATE INDEX IF NOT EXISTS "PostJobTarget_status_idx" ON "PostJobTarget"("status");
CREATE INDEX IF NOT EXISTS "PostJobTarget_postJobId_idx" ON "PostJobTarget"("postJobId");
CREATE INDEX IF NOT EXISTS "PostJobTarget_accountId_idx" ON "PostJobTarget"("accountId");
CREATE INDEX IF NOT EXISTS "PostJobTarget_accountId_status_idx" ON "PostJobTarget"("accountId", "status");
CREATE INDEX IF NOT EXISTS "PostJobTarget_platformPostId_idx" ON "PostJobTarget"("platformPostId");
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");
