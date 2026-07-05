# Multi-User Workspaces — Implementation Plan

> Start this only when a paying Team plan customer explicitly asks for it.

---

## What It Is

Allow multiple users to share a single workspace — connected accounts, scheduled posts, and templates are shared across team members. Each workspace has one billing subscription.

---

## DB Changes

### New models

```prisma
model Workspace {
  id        String   @id @default(cuid())
  name      String
  plan      String   @default("trialing")
  planStatus String  @default("trialing")
  trialEndsAt DateTime?
  dodoCustomerId String? @unique
  dodoSubId      String? @unique
  webhookUrl     String?

  members   WorkspaceMember[]
  accounts  Account[]
  postJobs  PostJob[]
  templates Template[]
  apiKeys   ApiKey[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model WorkspaceMember {
  id          String    @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  role        String    @default("member") // owner | admin | member
  invitedBy   String?
  joinedAt    DateTime  @default(now())

  @@unique([workspaceId, userId])
  @@index([userId])
}

model WorkspaceInvite {
  id          String    @id @default(cuid())
  workspaceId String
  email       String
  role        String    @default("member")
  token       String    @unique
  expiresAt   DateTime
  usedAt      DateTime?
  invitedBy   String
  createdAt   DateTime  @default(now())

  @@index([token])
}
```

### Migration strategy

- Every existing `User` gets a personal `Workspace` created automatically
- All `PostJob`, `Account`, `Template`, `ApiKey` rows get `workspaceId` set to that user's personal workspace
- `userId` fields on those models become `workspaceId`
- `User` model keeps billing fields temporarily, then migrates to `Workspace`

---

## API Changes

### Auth middleware
- Decode JWT → get `userId`
- Resolve active `workspaceId` from request header `X-Workspace-Id` or user's default workspace
- Attach `{ userId, workspaceId, role }` to request

### Routes to update (scope userId → workspaceId)
- `GET/POST /jobs` — scope to workspaceId
- `GET/PATCH/DELETE /jobs/:id` — verify workspaceId
- `GET/DELETE /accounts` — scope to workspaceId
- `GET /accounts/stats` — scope to workspaceId
- `GET/POST/DELETE /templates` — scope to workspaceId
- `GET/POST/DELETE /api-keys` — scope to workspaceId
- `POST /billing/*` — attach to workspaceId
- `GET /billing/status` — read from workspaceId

### New routes
```
POST   /workspaces                    — create workspace (owner)
GET    /workspaces                    — list user's workspaces
GET    /workspaces/:id                — workspace detail + members
PATCH  /workspaces/:id                — rename (admin+)
DELETE /workspaces/:id                — delete (owner only)

GET    /workspaces/:id/members        — list members
PATCH  /workspaces/:id/members/:uid   — change role (admin+)
DELETE /workspaces/:id/members/:uid   — remove member (admin+)

POST   /workspaces/:id/invites        — send invite email (admin+)
GET    /invites/:token                — get invite details (public)
POST   /invites/:token/accept         — accept invite (authed user)
DELETE /workspaces/:id/invites/:iid   — cancel invite (admin+)
```

### Role permissions
| Action | member | admin | owner |
|---|---|---|---|
| Compose & schedule posts | ✓ | ✓ | ✓ |
| Edit / delete own posts | ✓ | ✓ | ✓ |
| Edit / delete any post | — | ✓ | ✓ |
| Connect / disconnect accounts | — | ✓ | ✓ |
| Invite members | — | ✓ | ✓ |
| Remove members | — | ✓ | ✓ |
| Change member roles | — | — | ✓ |
| Manage billing | — | — | ✓ |
| Delete workspace | — | — | ✓ |

---

## Web Changes

### Sidebar
- Workspace name + avatar at top of sidebar
- Dropdown to switch workspaces (if user is in multiple)
- "Create workspace" option in dropdown

### New pages
- `/settings/workspace` — rename, manage members, invite, billing
- `/invites/[token]` — accept invite landing page (works when logged out → redirect to login then back)

### Posts page
- "Posted by" avatar on each job card showing which member scheduled it
- Store `createdByUserId` on `PostJob`

### Compose page
- No changes needed — workspace is resolved from context

---

## Plan Limits (per workspace, not per user)

```ts
// plans.ts — no interface change needed, just read from workspace.plan
const planCfg = getPlan(workspace.plan);
// account count, post count, etc. all enforced at workspace level
```

---

## Invite Flow

1. Admin enters email + role → `POST /workspaces/:id/invites`
2. API creates `WorkspaceInvite` row, sends email via Resend with link to `/invites/[token]`
3. User clicks link → if not logged in, redirected to `/login?next=/invites/[token]`
4. `POST /invites/:token/accept` → creates `WorkspaceMember`, marks invite used
5. User is now in the workspace — next page load resolves their workspaceId

---

## Hard Parts

- **Deep userId assumption** — every Prisma query needs updating. Do a global search for `userId` in `apps/api/src/routes/` and replace systematically.
- **Billing migration** — plan fields move from `User` to `Workspace`. Existing Dodo webhook handler needs to look up workspace by `dodoSubId`.
- **Default workspace resolution** — need to decide: cookie? header? last-used stored in User? Recommended: store `activeWorkspaceId` on `User`, update on switch.
- **SSE stream** — currently scoped to userId, needs to scope to workspaceId.
- **API keys** — currently per-user, need to become per-workspace with the workspace's plan controlling access.

---

## Estimated Effort

| Area | Effort |
|---|---|
| DB schema + migration | 1 day |
| API route updates (userId → workspaceId) | 2–3 days |
| New workspace/invite routes | 1 day |
| Web — workspace switcher + settings page | 1–2 days |
| Web — invite accept page | 0.5 days |
| Billing migration | 1 day |
| Testing + edge cases | 1 day |
| **Total** | **~8–10 days** |

---

## Start Condition

Build this when a **paying Team plan user** says "I need my team to access this." Not before.
