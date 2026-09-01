FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
RUN mkdir -p /app/apps/web/public
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Les variables NEXT_PUBLIC_* doivent être fournies au build
# car Next.js les fige (inlining) dans le code client généré.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

WORKDIR /app
RUN pnpm exec turbo run build --filter @opensio/web

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# Désactive la télémétrie Next.js
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set correct permissions for nextjs user
RUN mkdir .next && chown nextjs:nodejs .next

# Copie automatique des fichiers standalone générés par Next.js
# Le chemin correspond à la racine du monorepo
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# Les dossiers static et public doivent être copiés manuellement
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="[IP_ADDRESS]"

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://[IP_ADDRESS] || exit 1

# Démarrage du serveur Node.js généré par le mode standalone
CMD ["node", "apps/web/server.js"]
