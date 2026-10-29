-- CreateTable
CREATE TABLE "LifetimeStat" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "postsPublished" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifetimeStat_pkey" PRIMARY KEY ("id")
);
