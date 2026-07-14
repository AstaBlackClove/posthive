FROM node:22-alpine AS base
RUN npm install -g pnpm@9

# ── Install deps (cached until package.json / lockfile changes) ───────────────
FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile --filter web...

# NEXT_PUBLIC_* vars are baked at build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEB_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WEB_URL=$NEXT_PUBLIC_WEB_URL

COPY apps/web ./apps/web
RUN pnpm --filter web build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
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
