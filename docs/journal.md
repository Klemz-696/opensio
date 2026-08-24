# Journal de bord — OpenSIO

Ce journal consigne l'avancement chronologique du projet, les choix d'implémentation et les jalons validés.

---

## [Lot 0] — Socle Monorepo

**Date** : 24/08/2026  
**Objectif** : Initialisation du socle monorepo (pnpm workspaces + Turborepo), configurations partagées, conformité D-13, squelettes d'applications et pipeline CI.

### Réalisations
- Initialisation du monorepo pnpm (`pnpm-workspace.yaml`, `turbo.json`, `package.json` racine).
- Création du package partagé `@opensio/config` avec les configurations TypeScript (`base.json`, `next.json`, `nest.json`), ESLint 9 (flat config) et Tailwind CSS.
- Mise en place du script `scripts/check-file-size.mjs` garantissant le respect strict de la convention **D-13 / RM-13** (aucun fichier source > 400 lignes dans `apps/`, `packages/`, `infra/`).
- Création des squelettes d'applications :
  - `apps/web` : Next.js 15 App Router avec Tailwind CSS et tests Vitest/Testing Library.
  - `apps/api` : NestJS 11 avec endpoint `/health` minimal et tests Vitest.
- Création du fichier `infra/docker/docker-compose.dev.yml` pour le service PostgreSQL 16 Alpine en développement local.
- Mise en place du workflow GitHub Actions `.github/workflows/ci.yml`.
- Rédaction de `.env.example`, `.gitignore`, `README.md`, `LICENSE`.

### Décisions & Arbitrages
- Respect strict de l'isolation du Lot 0 : aucun code de base de données (Prisma), d'authentification ou de contenu pédagogique n'a été introduit.
- Validation automatique de tous les contrôles qualité (lint, typecheck, tests, build, check-file-size).
