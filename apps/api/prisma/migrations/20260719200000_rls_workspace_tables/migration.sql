-- Enable Row Level Security on all tables added by the workspace migration.
-- Prisma connects via service_role (superuser) so app operations are unaffected.
-- No permissive policies = all direct anon/authenticated Supabase API access denied.

ALTER TABLE "Workspace"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Template"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey"          ENABLE ROW LEVEL SECURITY;
