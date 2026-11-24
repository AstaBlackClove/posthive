-- AlterTable
ALTER TABLE "ContentLibrary" ADD COLUMN     "aiSummarize" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rssUrl" TEXT,
ADD COLUMN     "sourceType" TEXT NOT NULL DEFAULT 'csv';

-- CreateTable
CREATE TABLE "RssFeedItem" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "guid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RssFeedItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RssFeedItem_libraryId_guid_key" ON "RssFeedItem"("libraryId", "guid");

-- AddForeignKey
ALTER TABLE "RssFeedItem" ADD CONSTRAINT "RssFeedItem_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "ContentLibrary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
