-- Enable Row Level Security on all application tables.
-- Prisma connects via the service_role key which bypasses RLS,
-- so these policies block direct Supabase API / anon access only.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PostJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PostJobTarget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefreshToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordReset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Upload" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OAuthState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CancellationFeedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Allow the service_role (used by Prisma) full access to all tables.
CREATE POLICY "service_role_full_access_user" ON "User" USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full_access_account" ON "Account" USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full_access_postjob" ON "PostJob" USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full_access_postjobtarget" ON "PostJobTarget" USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full_access_refreshtoken" ON "RefreshToken" USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full_access_passwordreset" ON "PasswordReset" USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full_access_upload" ON "Upload" USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full_access_oauthstate" ON "OAuthState" USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full_access_cancellation" ON "CancellationFeedback" USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full_access_migrations" ON "_prisma_migrations" USING (auth.role() = 'service_role');
