-- CreateTable
CREATE TABLE "PostStats" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "reposts" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostStats_targetId_key" ON "PostStats"("targetId");

-- CreateIndex
CREATE INDEX "PostStats_targetId_idx" ON "PostStats"("targetId");

-- AddForeignKey
ALTER TABLE "PostStats" ADD CONSTRAINT "PostStats_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "PostJobTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
