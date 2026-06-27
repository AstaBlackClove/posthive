/*
  Warnings:

  - You are about to drop the column `refreshToken` on the `Account` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "expiresAt" DATETIME,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Account" ("avatarUrl", "createdAt", "credentials", "displayName", "expiresAt", "id", "platform", "updatedAt", "userId") SELECT "avatarUrl", "createdAt", "credentials", "displayName", "expiresAt", "id", "platform", "updatedAt", "userId" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE TABLE "new_PostJobTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postJobId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "platformPostId" TEXT,
    "replyContext" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PostJobTarget_postJobId_fkey" FOREIGN KEY ("postJobId") REFERENCES "PostJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PostJobTarget_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PostJobTarget" ("accountId", "attempts", "createdAt", "error", "id", "platformPostId", "postJobId", "replyContext", "status", "updatedAt") SELECT "accountId", "attempts", "createdAt", "error", "id", "platformPostId", "postJobId", "replyContext", "status", "updatedAt" FROM "PostJobTarget";
DROP TABLE "PostJobTarget";
ALTER TABLE "new_PostJobTarget" RENAME TO "PostJobTarget";
CREATE INDEX "PostJobTarget_postJobId_idx" ON "PostJobTarget"("postJobId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PostJob_scheduledFor_status_idx" ON "PostJob"("scheduledFor", "status");
