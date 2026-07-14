FROM node:22-alpine AS base
RUN npm install -g pnpm@9

# ── Install deps + build ───────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
RUN pnpm install --frozen-lockfile --filter api...

COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN npx --no-install prisma generate
RUN pnpm build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV NODE_OPTIONS=--dns-result-order=ipv4first

RUN apk add --no-cache openssl
RUN addgroup -S posthive && adduser -S posthive -G posthive

# Copy pnpm virtual store (contains all actual package files)
COPY --from=builder --chown=posthive:posthive /app/node_modules /app/node_modules
# Copy api-level node_modules (symlinks into the store above + .bin scripts)
COPY --from=builder --chown=posthive:posthive /app/apps/api/node_modules /app/apps/api/node_modules
# App files
COPY --from=builder --chown=posthive:posthive /app/apps/api/dist /app/apps/api/dist
COPY --from=builder --chown=posthive:posthive /app/apps/api/prisma /app/apps/api/prisma
COPY --from=builder --chown=posthive:posthive /app/apps/api/package.json /app/apps/api/package.json

# Run from apps/api so Node resolves packages via apps/api/node_modules
WORKDIR /app/apps/api
RUN mkdir -p uploads && chown posthive:posthive uploads
USER posthive
EXPOSE 3001

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/index.js"]
