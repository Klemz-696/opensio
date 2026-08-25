# ==============================================================================
# OpenSIO Web — Dockerfile Multi-stage de Production (Next.js 15 App Router)
# ==============================================================================

# 1. Image de base
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.23.0 --activate
RUN apk add --no-cache libc6-compat wget bash dumb-init

# 2. Installation des dépendances du monorepo
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/content-schema/package.json ./packages/content-schema/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# 3. Compilation Next.js
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/web ./apps/web

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm --filter @opensio/content-schema build

WORKDIR /app/apps/web
RUN pnpm build

# 4. Image finale d'exécution (durcie, non-root)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat wget bash dumb-init

USER node

COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/packages ./packages
COPY --chown=node:node --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --chown=node:node --from=builder /app/apps/web/.next ./apps/web/.next
COPY --chown=node:node --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --chown=node:node --from=builder /app/package.json ./package.json

WORKDIR /app/apps/web

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["dumb-init", "--", "node_modules/.bin/next", "start", "--port", "3000", "--hostname", "0.0.0.0"]
