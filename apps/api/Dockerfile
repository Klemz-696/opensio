FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .
# Installation globale pour la phase de build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Génération Prisma et Build NestJS via Turbo (pour inclure les dépendances workspace)
WORKDIR /app
RUN pnpm --filter @opensio/api db:generate
RUN pnpm exec turbo run build --filter @opensio/api

# Déploiement isolé de l'app API avec uniquement ses dépendances de production
WORKDIR /app
RUN pnpm --filter @opensio/api deploy --prod --legacy /app/out

# Génération Prisma dans le dossier de déploiement (requis car le client est généré dans node_modules)
WORKDIR /app/out
# On copie le schéma Prisma pour la génération
COPY apps/api/prisma ./prisma
ENV CI=true
RUN npx -y prisma@6.19.3 generate --schema=./prisma/schema

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copie depuis le dossier de déploiement
COPY --from=build /app/out .

# Configuration utilisateur non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 4000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health || exit 1

# Commande de démarrage avec exécution des migrations
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema && node dist/main.js"]