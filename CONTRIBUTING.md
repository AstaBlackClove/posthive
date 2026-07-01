# Contributing to Posthive

Thanks for taking the time to contribute! This is a self-hosted, open-source project and all contributions are welcome.

---

## Ways to Contribute

- **Bug reports** — open an issue with steps to reproduce
- **Feature requests** — open an issue describing the use case
- **Platform adapters** — add support for a new social platform
- **Bug fixes** — submit a pull request referencing the issue
- **Documentation** — improve the README, env var docs, or inline comments

---

## Development Setup

### Prerequisites

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for the local PostgreSQL database
- A Redis instance — [Upstash](https://upstash.com) free tier is easiest

### Steps

```bash
# 1. Fork and clone
git clone https://github.com/your-username/social-scheduler.git
cd social-scheduler

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Fill in the required values (see apps/api/.env.example for guidance)

# 4. Start the dev servers (Docker Postgres starts automatically)
pnpm dev
```

`pnpm dev` automatically starts a PostgreSQL container named `posthive-pg` via Docker and runs Prisma migrations on first run. The API runs on http://localhost:3001 and the web app on http://localhost:3000.

### Database

```bash
# Run migrations after schema changes
cd apps/api && pnpm db:migrate

# Open Prisma Studio (GUI)
cd apps/api && pnpm db:studio

# Stop the Postgres container
pnpm db:stop

# Start it again without full dev
pnpm db:start
```

The local database uses PostgreSQL (same as production) to avoid SQLite/Postgres compatibility issues.

---

## Adding a New Platform Adapter

This is the most impactful contribution. Here's how:

### 1. Create the adapter file

```ts
// apps/api/src/adapters/your-platform.ts
import type { PlatformAdapter, PostResult, CommentResult } from "./types.js";
import type { Account } from "@prisma/client";

export const yourPlatformAdapter: PlatformAdapter = {
  name: "your-platform",

  async refreshTokenIfNeeded(account) {
    // refresh OAuth token if expiring soon, return updated account
    return account;
  },

  async createPost(account, content) {
    // post content.text and content.mediaUrls to the platform
    // return { platformPostId, replyContext }
  },

  async createComment(account, replyContext, comment) {
    // post comment as a reply using replyContext from createPost
    // return { platformCommentId }
  },
};
```

### 2. Register the adapter

```ts
// apps/api/src/adapters/index.ts
import { yourPlatformAdapter } from "./your-platform.js";

export const adapters: Record<string, PlatformAdapter> = {
  bluesky: blueskyAdapter,
  threads: threadsAdapter,
  "your-platform": yourPlatformAdapter, // add here
};
```

### 3. Add a connect route

Add your auth flow to `apps/api/src/routes/accounts.ts` (for simple credential-based auth like Bluesky) or `apps/api/src/routes/auth.ts` (for OAuth).

### 4. Add the UI card

Add a platform card to `apps/web/src/app/accounts/page.tsx` following the pattern of the existing Bluesky or Threads cards.

---

## Pull Request Guidelines

- **One PR per feature or fix** — keep changes focused
- **Branch naming** — `feat/platform-linkedin`, `fix/threads-carousel`, `docs/setup-guide`
- **Commit messages** — use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
- **No breaking changes without discussion** — open an issue first for large changes
- **Don't commit `.env` files** — credentials must never be committed
- **TypeScript** — all new code must pass `pnpm typecheck` with no errors

---

## Project Structure

```
apps/api/src/
├── adapters/     # One file per platform — implement PlatformAdapter
├── lib/          # Queue, worker, encryption, storage — don't modify unless needed
├── routes/       # HTTP routes — accounts, jobs, auth, upload
└── runner/       # Job state machine — handles post → comment flow

apps/web/src/
├── app/          # Pages: compose (/), jobs (/jobs), accounts (/accounts)
├── components/   # Shared UI components
└── lib/          # API client utility
```

---

## Reporting Security Issues

Please **do not** open a public GitHub issue for security vulnerabilities. Email the maintainer directly instead. See [SECURITY.md](SECURITY.md) for details.

---

## License

By contributing you agree your changes will be licensed under the same GNU Affero General Public License v3.0 as the rest of the project.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating you agree to abide by its terms.
