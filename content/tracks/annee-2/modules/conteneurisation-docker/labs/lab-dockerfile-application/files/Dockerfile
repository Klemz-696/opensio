# TODO: Étape 1 - Builder (Node.js Alpine)
# - FROM node:22-alpine AS builder
# - WORKDIR /app
# - COPY package*.json ./
# - RUN npm ci
# - COPY . .
# - RUN npm run build

# TODO: Étape 2 - Runtime de Production
# - FROM node:22-alpine
# - WORKDIR /app
# - ENV NODE_ENV=production PORT=3000
# - COPY package*.json ./
# - RUN npm ci --omit=dev
# - COPY --from=builder /app/dist ./dist
# - EXPOSE 3000
# - USER node
# - CMD ["node", "dist/main.js"]
