-- Rename the approval role: "approver" → "designer" (string columns, no ALTER needed).
-- Also fixes pending invites so accepting an old invite doesn't recreate an "approver" member.
UPDATE "WorkspaceMember" SET role = 'designer' WHERE role = 'approver';
UPDATE "WorkspaceInvite" SET role = 'designer' WHERE role = 'approver';
