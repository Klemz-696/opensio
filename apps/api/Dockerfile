# ==============================================================================
# OpenSIO API — Dockerfile Multi-stage de Production
# ==============================================================================

# 1. Image de base commune
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.23.0 --activate
RUN apk add --no-cache openssl libc6-compat wget bash dumb-init

# 2. Installation des dépendances du monorepo
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/content-schema/package.json ./packages/content-schema/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# 3. Compilation de l'API et génération Prisma
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm --filter @opensio/content-schema build

WORKDIR /app/apps/api
RUN pnpm exec prisma generate --schema=prisma/schema
RUN pnpm build

# 4. Image finale d'exécution (durcie, non-root)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV API_PORT=4000

RUN apk add --no-cache openssl libc6-compat wget bash dumb-init

USER node

COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --chown=node:node --from=builder /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --chown=node:node --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --chown=node:node --from=builder /app/packages ./packages
COPY --chown=node:node --from=builder /app/package.json ./package.json

WORKDIR /app/apps/api

COPY --chown=node:node apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4000/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--", "./docker-entrypoint.sh"]
