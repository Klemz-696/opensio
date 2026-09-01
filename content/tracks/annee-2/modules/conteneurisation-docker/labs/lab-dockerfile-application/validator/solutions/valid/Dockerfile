# ─── Étape 1 : Builder ───
FROM node:22-alpine AS builder

WORKDIR /app

# Optimisation du cache des dépendances
COPY package*.json ./
RUN npm ci

# Compilation TypeScript
COPY . .
RUN npm run build

# ─── Étape 2 : Runtime de Production ───
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Installation des dépendances de production uniquement
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Récupération des artefacts compilés depuis le builder
COPY --from=builder /app/dist ./dist

# Documentation du port d'écoute
EXPOSE 3000

# Sécurité : exécution sous utilisateur non privilégié
USER node

# Démarrage en forme exec
CMD ["node", "dist/main.js"]
