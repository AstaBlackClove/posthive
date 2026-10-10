-- CreateIndex
CREATE INDEX "Account_workspaceId_platform_idx" ON "Account"("workspaceId", "platform");

-- CreateIndex
CREATE INDEX "PostJob_workspaceId_status_idx" ON "PostJob"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "PostJob_workspaceId_createdAt_idx" ON "PostJob"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "PostJob_workspaceId_scheduledFor_idx" ON "PostJob"("workspaceId", "scheduledFor");

-- CreateIndex
CREATE INDEX "PostJob_workspaceId_scheduledFor_id_idx" ON "PostJob"("workspaceId", "scheduledFor", "id");

-- CreateIndex
CREATE INDEX "PostJobTarget_status_idx" ON "PostJobTarget"("status");

-- CreateIndex
CREATE INDEX "PostJobTarget_postJobId_idx" ON "PostJobTarget"("postJobId");

-- CreateIndex
CREATE INDEX "PostJobTarget_accountId_idx" ON "PostJobTarget"("accountId");

-- CreateIndex
CREATE INDEX "PostJobTarget_accountId_status_idx" ON "PostJobTarget"("accountId", "status");

-- CreateIndex
CREATE INDEX "PostJobTarget_platformPostId_idx" ON "PostJobTarget"("platformPostId");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
