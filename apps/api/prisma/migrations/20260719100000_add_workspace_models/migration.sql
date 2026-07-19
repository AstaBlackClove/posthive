-- Step 1: Create new tables (safe, additive)

CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'trialing',
    "planStatus" TEXT NOT NULL DEFAULT 'trialing',
    "trialEndsAt" TIMESTAMP(3),
    "dodoCustomerId" TEXT,
    "dodoSubId" TEXT,
    "allowTrial" BOOLEAN NOT NULL DEFAULT true,
    "webhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceInvite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- Step 2: Add nullable workspaceId to existing tables

ALTER TABLE "Account"  ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "PostJob"  ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Template" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "ApiKey"   ADD COLUMN "workspaceId" TEXT;

-- Step 3: Add activeWorkspaceId to User (keep billing columns for now)

ALTER TABLE "User" ADD COLUMN "activeWorkspaceId" TEXT;

-- Step 4: Data migration — create a personal workspace for every existing user
-- Copy their billing data, make them owner, wire up all their resources.

DO $$
DECLARE
  u RECORD;
  ws_id TEXT;
BEGIN
  FOR u IN SELECT * FROM "User" LOOP
    -- Generate a workspace id
    ws_id := gen_random_uuid()::text;

    -- Create personal workspace copying billing fields
    INSERT INTO "Workspace" ("id", "name", "plan", "planStatus", "trialEndsAt",
                             "dodoCustomerId", "dodoSubId", "allowTrial", "webhookUrl",
                             "createdAt", "updatedAt")
    VALUES (
      ws_id,
      COALESCE(u.name, u.email) || '''s Workspace',
      COALESCE(u.plan, 'trialing'),
      COALESCE(u."planStatus", 'trialing'),
      u."trialEndsAt",
      u."dodoCustomerId",
      u."dodoSubId",
      false,  -- allowTrial=false: existing users already had their trial
      u."webhookUrl",
      NOW(),
      NOW()
    );

    -- Add user as owner
    INSERT INTO "WorkspaceMember" ("id", "workspaceId", "userId", "role", "joinedAt")
    VALUES (gen_random_uuid()::text, ws_id, u.id, 'owner', NOW());

    -- Set as active workspace
    UPDATE "User" SET "activeWorkspaceId" = ws_id WHERE id = u.id;

    -- Wire up all their resources
    UPDATE "Account"  SET "workspaceId" = ws_id WHERE "userId" = u.id;
    UPDATE "PostJob"  SET "workspaceId" = ws_id WHERE "userId" = u.id;
    UPDATE "Template" SET "workspaceId" = ws_id WHERE "userId" = u.id;
    UPDATE "ApiKey"   SET "workspaceId" = ws_id WHERE "userId" = u.id;
  END LOOP;
END $$;

-- Step 5: Now safe to drop old billing columns from User

ALTER TABLE "User"
  DROP COLUMN "plan",
  DROP COLUMN "planStatus",
  DROP COLUMN "trialEndsAt",
  DROP COLUMN "dodoCustomerId",
  DROP COLUMN "dodoSubId",
  DROP COLUMN "webhookUrl";

-- Step 6: Drop old unique indexes from User that no longer exist

DROP INDEX IF EXISTS "User_dodoCustomerId_key";
DROP INDEX IF EXISTS "User_dodoSubId_key";

-- Step 7: Unique indexes on Workspace

CREATE UNIQUE INDEX "Workspace_dodoCustomerId_key" ON "Workspace"("dodoCustomerId");
CREATE UNIQUE INDEX "Workspace_dodoSubId_key"      ON "Workspace"("dodoSubId");

-- Step 8: Indexes

CREATE INDEX "WorkspaceMember_userId_idx"      ON "WorkspaceMember"("userId");
CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

CREATE UNIQUE INDEX "WorkspaceInvite_token_key"       ON "WorkspaceInvite"("token");
CREATE INDEX "WorkspaceInvite_token_idx"              ON "WorkspaceInvite"("token");
CREATE INDEX "WorkspaceInvite_workspaceId_idx"        ON "WorkspaceInvite"("workspaceId");

CREATE INDEX "Account_workspaceId_idx"  ON "Account"("workspaceId");
CREATE INDEX "PostJob_workspaceId_idx"  ON "PostJob"("workspaceId");
CREATE INDEX "Template_workspaceId_idx" ON "Template"("workspaceId");
CREATE INDEX "ApiKey_workspaceId_idx"   ON "ApiKey"("workspaceId");

-- Step 9: Foreign keys

ALTER TABLE "User"
  ADD CONSTRAINT "User_activeWorkspaceId_fkey"
  FOREIGN KEY ("activeWorkspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkspaceMember"
  ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceMember"
  ADD CONSTRAINT "WorkspaceMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceInvite"
  ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Account"
  ADD CONSTRAINT "Account_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostJob"
  ADD CONSTRAINT "PostJob_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApiKey"
  ADD CONSTRAINT "ApiKey_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Template"
  ADD CONSTRAINT "Template_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
