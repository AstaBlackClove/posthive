-- CreateTable
CREATE TABLE "LifetimeStat" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "postsPublished" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifetimeStat_pkey" PRIMARY KEY ("id")
);

-- Enable Row Level Security. Prisma connects via service_role (bypasses RLS),
-- so app operations are unaffected. No permissive policies = all direct
-- anon/authenticated Supabase API access denied.
ALTER TABLE "LifetimeStat" ENABLE ROW LEVEL SECURITY;
