-- CreateTable: Session — anonymous + pre-login visitor journey
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "entry" TEXT NOT NULL,
    "exit" TEXT,
    "pages" JSONB NOT NULL,
    "referrer" TEXT,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Event — logged-in conversion events only
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "properties" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_visitorId_idx" ON "Session"("visitorId");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_createdAt_idx" ON "Session"("createdAt");
CREATE INDEX "Event_userId_idx" ON "Event"("userId");
CREATE INDEX "Event_event_idx" ON "Event"("event");
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;

-- Service role full access (Supabase only — skipped on local Postgres)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'CREATE POLICY "service_role_all_session" ON "Session" FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "service_role_all_event" ON "Event" FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END
$$;
