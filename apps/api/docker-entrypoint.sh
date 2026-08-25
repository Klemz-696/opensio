#!/bin/sh
set -e

echo "🚀 [OpenSIO API] Démarrage du service API NestJS..."

echo "📦 [OpenSIO API] Application des migrations Prisma..."
npx prisma migrate deploy --schema=prisma/schema

if [ -d "/app/content" ] || [ -d "./content" ] || [ -d "../../content" ]; then
  echo "📚 [OpenSIO API] Synchronisation du contenu pédagogique..."
  node dist/sync/cli.js || echo "⚠️ Avertissement : échec de synchronisation du contenu (non bloquant)"
fi

echo "🟢 [OpenSIO API] Lancement du serveur NestJS sur le port ${API_PORT:-4000}..."
exec node dist/main.js
