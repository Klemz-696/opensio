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

## 2026-08-24 — Clôture du Lot 0

### Livré

Monorepo pnpm + Turborepo, configs partagées, squelettes web/api, CI GitHub Actions,
contrôle D-13, compose dev PostgreSQL. PR #1 mergée après revue (artefacts de build
retirés, .gitattributes LF ajouté).

### Incident CI — 5 runs, 3 causes racines

1. Crash pnpm/action-setup : `.npmrc` avec `only-built-dependencies` en format string
   → `onlyBuiltDependencies?.sort is not a function`
2. Bloc `allowBuilds` auto-généré par pnpm 11 avec placeholders non remplacés
   ("set this to true or false") → supprimé par erreur lors du nettoyage
3. ERR_PNPM_IGNORED_BUILDS persistant : pnpm 11 n'honore plus `onlyBuiltDependencies`,
   le mécanisme est `allowBuilds` (map paquet → booléen). Résolu via `pnpm approve-builds`.

### Leçons

- Lire les logs d'erreur jusqu'au bout : la solution (« Run pnpm approve-builds »)
  figurait dans le premier log.
- Reproduire en local (suppression node_modules + install figée) avant de déboguer
  via la CI.
- Revoir systématiquement les configs générées par agent (placeholders, formats).

---

## [Lot 1] — Données & Schéma Prisma MVP

**Date** : 24/08/2026  
**Branche** : `feat/b02-prisma-schema`  
**Objectif** : Modélisation complète des 15 tables du MVP sous Prisma 6, respect strict de la convention D-13 (fichiers partiels), migrations PostgreSQL, amorçage (Seed) et intégration de `PrismaService` dans NestJS.

### Réalisations

- Découpage modulaire du schéma Prisma (`apps/api/prisma/schema/`) en 6 fichiers spécialisés :
  - `base.prisma` : Datasource PostgreSQL, extensions `citext` et `pgcrypto`, client generator.
  - `users.prisma` : Modèles `User`, `RefreshToken`, `PasswordResetToken`, enums `UserRole`, `UserStatus`.
  - `content.prisma` : Modèles `Track`, `Module`, `Lesson`, `Quiz`, `QuizQuestion`, `LessonLab`, enum `QuizQuestionKind`.
  - `progress.prisma` : Modèles `QuizAttempt`, `LessonProgress`, `ActivityEvent`, enum `LessonProgressStatus`.
  - `labs.prisma` : Modèles `Lab`, `LabSession`, `LabEvent`, enums `LabLevel`, `LabSessionStatus`, `LabEventKind`.
  - `audit.prisma` : Modèle `AuditLog`.
- Ajout du modèle d'association `LessonLab` (relation n-n ordonnée et paramétrable entre `lessons` et `labs`, §21) avec clé primaire composite `[lesson_id, lab_id]`.
- Seuil de réussite par défaut des quiz ajusté à 80 % (`Quiz.passingScore @default(80)`, règle RM-01).
- Définition des index minimaux selon le §21 du Blueprint.
- Création et application de la migration initiale unique et propre `20260824131650_init` sur le conteneur Docker PostgreSQL.
- Implémentation du script de seed idempotent `apps/api/prisma/seed.ts` avec hachage **Argon2id** (m=64 Mio, t=3, p=4), variables `SEED_ADMIN_PASSWORD` / `SEED_STUDENT_PASSWORD`, fallback dev sécurisé et avertissement hors environnement de développement.
- Création de `PrismaService` (avec hooks NestJS `onModuleInit` / `onModuleDestroy`), `PrismaModule` global et tests unitaires associés dans `apps/api`.
- Scripts de gestion de données ajoutés aux `package.json` (`db:migrate`, `db:generate`, `seed`).

### Validations

- `pnpm lint` : 100% vert (0 erreur).
- `pnpm typecheck` : 100% vert (0 erreur).
- `pnpm test` : 100% vert (tests unitaires API et Web passants).
- `node scripts/check-file-size.mjs` : 100% conforme D-13 (24 fichiers analysés, 0 avertissement, 0 violation).
- `pnpm build` : Build API (NestJS) et Web (Next.js 15) réussi sans erreur.
- Migration initiale et Seed réappliqués et testés avec succès sur PostgreSQL Docker.


