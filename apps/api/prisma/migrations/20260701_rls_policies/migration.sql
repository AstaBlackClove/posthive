-- Enable Row Level Security on all application tables.
-- Supabase's service_role key bypasses RLS automatically (it is a superuser).
-- Prisma uses the service_role key, so all app operations continue to work.
-- These policies block direct anon/authenticated Supabase API access only.
-- Storage uploads go through the API using service_role — unaffected.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PostJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PostJobTarget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefreshToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordReset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Upload" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OAuthState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CancellationFeedback" ENABLE ROW LEVEL SECURITY;

-- No permissive policies for anon or authenticated roles = all direct API access denied.
-- service_role is exempt from RLS by default in Supabase/PostgreSQL.
