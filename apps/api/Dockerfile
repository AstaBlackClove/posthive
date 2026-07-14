FROM node:20-alpine AS base
RUN npm install -g pnpm@9

# ── Install deps ──────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
RUN pnpm install --frozen-lockfile --filter api...

# ── Build ─────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY apps/api ./apps/api
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
WORKDIR /app/apps/api
RUN npx prisma generate
RUN pnpm build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS=--dns-result-order=ipv4first

RUN addgroup -S posthive && adduser -S posthive -G posthive

COPY --from=builder --chown=posthive:posthive /app/apps/api/dist ./dist
COPY --from=builder --chown=posthive:posthive /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=posthive:posthive /app/apps/api/prisma ./prisma
COPY --from=builder --chown=posthive:posthive /app/apps/api/package.json ./

USER posthive
EXPOSE 3001

CMD ["sh", "-c", "node node_modules/.bin/prisma migrate deploy && node dist/index.js"]
