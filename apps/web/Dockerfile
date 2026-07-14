FROM node:20-alpine AS base
RUN npm install -g pnpm@9

# ── Install deps ──────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile --filter web...

# ── Build ─────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY apps/web ./apps/web
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# NEXT_PUBLIC_* vars are baked at build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEB_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WEB_URL=$NEXT_PUBLIC_WEB_URL

WORKDIR /app/apps/web
RUN pnpm build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S posthive && adduser -S posthive -G posthive

# standalone output from next.config.ts
COPY --from=builder --chown=posthive:posthive /app/apps/web/.next/standalone ./
COPY --from=builder --chown=posthive:posthive /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=posthive:posthive /app/apps/web/public ./apps/web/public

USER posthive
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
