-- CreateTable
CREATE TABLE "ContentLibrary" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "postsPerDay" INTEGER NOT NULL DEFAULT 1,
    "timeSlots" JSONB NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "accountIds" JSONB NOT NULL,
    "lastDripAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryItem" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "commentText" TEXT,
    "mediaUrls" JSONB NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "scheduledJobId" TEXT,
    "publishedAt" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentLibrary_workspaceId_idx" ON "ContentLibrary"("workspaceId");

-- CreateIndex
CREATE INDEX "ContentLibrary_status_idx" ON "ContentLibrary"("status");

-- CreateIndex
CREATE INDEX "LibraryItem_libraryId_status_idx" ON "LibraryItem"("libraryId", "status");

-- CreateIndex
CREATE INDEX "LibraryItem_libraryId_order_idx" ON "LibraryItem"("libraryId", "order");

-- CreateIndex
CREATE INDEX "LibraryItem_workspaceId_idx" ON "LibraryItem"("workspaceId");

-- CreateIndex
CREATE INDEX "LibraryItem_status_idx" ON "LibraryItem"("status");

-- AddForeignKey
ALTER TABLE "ContentLibrary" ADD CONSTRAINT "ContentLibrary_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryItem" ADD CONSTRAINT "LibraryItem_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "ContentLibrary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
