-- Add per-workspace custom limit overrides (admin-only)
-- When set, these override the plan's default limits for this specific workspace.
ALTER TABLE "Workspace" ADD COLUMN "customMaxLibraries" INTEGER;
ALTER TABLE "Workspace" ADD COLUMN "customMaxDripPerDay" INTEGER;
ALTER TABLE "Workspace" ADD COLUMN "customMaxLibraryItems" INTEGER;
