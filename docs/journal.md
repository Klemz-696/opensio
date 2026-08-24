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

## 2026-08-24 — Incident : main rouge après merge PR #2

- PR #2 mergée avec CI rouge (tests PrismaService KO) → main cassé.
- Cause racine : le postinstall de @prisma/client ne trouve pas le schéma en
  monorepo pnpm ; le client n'était jamais généré en CI. Local vert car
  `prisma migrate dev` avait généré le client.
- Fix : étape `prisma generate` explicite dans ci.yml (PR #3, CI verte).
- Hygiène : .claude/settings.local.json retiré du suivi Git.
- Leçons : ne jamais merger sur CI rouge ; activer la protection de branche ;
  un test vert en local ne prouve pas le vert en CI (environnement vierge).

---

## [Lot 2] — Contenu & Synchronisation

**Date** : 24/08/2026  
**Branche** : `feat/b04-content-schema-sync`  
**Objectif** : Schémas de validation Zod du contenu pédagogique (1 schéma = 1 fichier, D-13), moteur de synchronisation idempotent et tout-ou-rien (`content:sync`), module de démonstration unique (`reseaux-fondamentaux`) avec leçon, quiz, lab niveau 2 et validateur avec suite de tests.

### Réalisations

- **Package `@opensio/content-schema`** :
  - Découpage strict en 1 schéma Zod par fichier :
    - `track.ts` : schéma `TrackSchema` pour `track.yaml`.
    - `module.ts` : schéma `ModuleSchema` pour `module.yaml`.
    - `lesson.ts` : schéma `LessonFrontMatterSchema` pour le front matter Markdown.
    - `quiz.ts` : schéma `QuizSchema` pour les quiz YAML (questions single/multiple).
    - `lab.ts` : schéma `LabSchema` pour les labs YAML (niveaux 1 à 4, critères, barème, indices).
  - Utilitaires de parsing sécurisé (`parser.ts`) et de formatage d'erreurs localisées (`formatter.ts`).
  - Suite de tests unitaires Vitest (18 tests) couvrant les cas valides, invalides et les messages d'erreur.
- **Module de démonstration unique** :
  - `content/tracks/annee-1/track.yaml` : métadonnées de la 1ère année BTS SIO SISR.
  - `content/tracks/annee-1/modules/reseaux-fondamentaux/` :
    - `module.yaml` : métadonnées du module de fondamentaux réseaux.
    - `lessons/01-adressage-ipv4.md` : leçon rédigée en français (structure IPv4, binaire, CIDR, RFC 1918, commandes).
    - `quizzes/quiz-adressage.yaml` : quiz de 5 questions (QCM single/multiple avec explications).
    - `labs/lab-plan-adressage/` : lab de niveau 2 complet avec `lab.yaml`, fichier initial `files/plan.csv`, validateur autonome `validator/validate.mjs`, documentation `validator/README.md`, suite de fixtures (`solutions/valid`, `solutions/invalid-overlap`, `solutions/invalid-capacity`) et tests automatisés.
  - Aucun autre contenu ajouté (respect strict du périmètre).
- **Moteur de synchronisation `content:sync`** :
  - Architecture modulaire dans `apps/api/src/sync/` (scanner, validator, writer, writer-mappers, writer-cleanup, reporter, cli).
  - Synchronisation atomique et transactionnelle via Prisma `$transaction` : upsert par slug des tables `tracks`, `modules`, `lessons`, `quizzes`, `quiz_questions`, `labs` et peuplement de `lesson_labs`.
  - Nettoyage automatique des entités orphelines/obsolètes supprimées de Git.
  - Comportement tout-ou-rien : validation stricte préalable sans altération de la base en cas d'erreur de contenu.
- **Intégration & CI** :
  - Workflow GitHub Actions `.github/workflows/content-validate.yml`.
  - Scripts `content:sync` et `content:validate` au package.json racine et dans les applications.

### Validations

- `pnpm lint` : 100% vert (0 erreur, 0 avertissement).
- `pnpm typecheck` : 100% vert (0 erreur TypeScript).
- `pnpm test` : 100% vert (28 tests unitaires et d'intégration passants).
- `node scripts/check-file-size.mjs` : 100% conforme D-13 (45 fichiers analysés, 0 violation, 0 avertissement).
- `pnpm build` : Build complet (Next.js 15 App Router, NestJS 11, packages) réussi sans erreur.
- `pnpm content:sync` exécuté consécutivement : 100% « inchangés » au 2e passage (idempotence réelle sans réinsertion ni régénération d'UUID).
- Vérification SQL : IDs des `quiz_questions` strictement identiques avant et après le 2e passage.
- Test avec fichier volontairement invalide : échec propre avec diagnostic précis (fichier + champ + erreur) et 0 modification en base.

## 2026-08-24 — Revue Lot 2 : Idempotence stricte des relations enfants

- **Problème identifié** : la synchronisation effectuait un delete/recreate sur `quiz_questions` et `lesson_labs`, régénérant les UUIDs des questions et affichant `+5 créés` / `+1 créés` au 2e run.
- **Correction apportée** :
  - Ajout de la contrainte unique `@@unique([quizId, position])` sur `QuizQuestion` et régénération propre de la migration initiale.
  - Implémentation d'un upsert stable par clé naturelle/composite (`quizId_position` pour les questions, `lessonId_labId` pour les associations).
  - Détection fine des changements : une entité non modifiée conserve son ID et est comptabilisée en `inchangés`.
- **Résultat** : 100% des compteurs à `= inchangés` dès la 2e exécution, intégrité des références d'essais de quiz garantie.

## 2026-08-24 — Fix CI : Service PostgreSQL & isolation propre des tests d'intégration

- **Problème identifié** : En CI, `src/sync/sync.spec.ts` échouait avec `PrismaClientInitializationError P1012` car le hook `beforeAll` tentait de se connecter sans instance PostgreSQL active.
- **Correction apportée** :
  - Ajout du service conteneur `postgres:16-alpine` avec healthcheck dans `.github/workflows/ci.yml`.
  - Définition de `DATABASE_URL` et exécution de `prisma migrate deploy` en CI avant les tests.
  - Encapsulation des tests de base de données de `sync.spec.ts` dans `describe.skipIf(!process.env.DATABASE_URL)` avec gestion propre de la connexion/déconnexion, permettant d'exécuter les tests unitaires même avec PostgreSQL arrêté sans aucune erreur.

---

## [Lot 3] — Module Auth & Autorisation

**Date** : 24/08/2026  
**Branche** : `feat/b03-auth`  
**Objectif** : Implémentation complète du module d'authentification et d'autorisation (`apps/api/src/modules/auth/`) selon §22.1, §29, §30, §39, D-09, D-13/RM-13 et RM-12.

### Réalisations

- **Endpoints `/api/v1/auth` (§22.1)** :
  - `POST /register` : Inscription sécurisée (rôle `STUDENT`, statut `ACTIVE`, activable/désactivable via `REGISTRATION_ENABLED`).
  - `POST /login` : Connexion email/mot de passe → Access token JWT (15 min) + Refresh token opaque 256 bits via cookie `HttpOnly; SameSite=Lax; Path=/api/v1/auth`. Rate-limité à 5 req/min/IP.
  - `POST /refresh` : Rotation du refresh token à chaque appel avec détection de réutilisation (révocation immédiate de toute la chaîne de tokens de l'utilisateur).
  - `POST /logout` : Révocation du refresh token et suppression du cookie.
  - `POST /forgot-password` : Demande de réinitialisation de mot de passe (token SHA-256 à usage unique, durée 1h, rate-limité).
  - `POST /reset-password` : Réinitialisation du mot de passe avec validation de la politique et révocation des refresh tokens actifs.
  - `GET /me` : Profil de l'utilisateur authentifié (protégé par `AuthGuard`).
- **Sécurité cryptographique et jetons (D-09 / §29.1)** :
  - **Argon2id** : $m = 64\text{ Mio}$ (`memoryCost: 65536`), $t = 3$, $p = 4$.
  - **Politique de mot de passe** : $\ge 12$ caractères et au moins 3 classes (minuscules, majuscules, chiffres, caractères spéciaux).
  - **JWT HS256** : Access token 15 min signé avec `JWT_SECRET` ($\ge 64$ octets validé au boot via Zod). Claims : `sub`, `role`, `email`, `displayName`, `iat`, `exp`.
  - **Refresh Tokens opaques** : 256 bits aléatoires cryptographiques, stockés uniquement sous forme de hash SHA-256 dans `refresh_tokens.token_hash`.
  - **Rotation & Détection de réutilisation** : rotation atomique à chaque `/refresh` ; si un token déjà révoqué/remplacé est réutilisé, détection immédiate de vol de jeton $\rightarrow$ révocation de TOUS les refresh tokens de l'utilisateur + événement d'audit de sécurité.
- **Guards, Décorateurs et Rate Limiting** :
  - `AuthGuard` (JWT Bearer), `RolesGuard` (`@Roles()`), `@CurrentUser()`, `@Public()`.
  - `RateLimitGuard` (`@RateLimit(5, 60)`) avec fenêtre glissante par IP.
- **Journalisation d'audit (RM-12)** :
  - `AuditService` écrivant dans `audit_logs` pour chaque événement d'authentification (`AUTH_LOGIN_SUCCESS`, `AUTH_LOGIN_FAILED`, `AUTH_REGISTER`, `AUTH_LOGOUT`, `AUTH_REFRESH`, `AUTH_REFRESH_REUSE_DETECTED`, `AUTH_PASSWORD_RESET_REQUESTED`, `AUTH_PASSWORD_RESET_SUCCESS`), sans jamais journaliser de secret ni de mot de passe.
- **Format d'erreur et Validation Zod** :
  - DTOs validés par Zod (`RegisterDto`, `LoginDto`, `ForgotPasswordDto`, `ResetPasswordDto`).
  - Filtre d'exception global RFC 7807 (`application/problem+json`).
- **Découpage modulaire strict D-13 / RM-13** :
  - Aucun fichier source ne dépasse 300 lignes (0 violation, 0 avertissement sur l'ensemble du monorepo).
  - Découpage par responsabilité : `auth.service.ts`, `password.service.ts`, `password-reset.service.ts`, `jwt.service.ts`, `refresh-token.service.ts`, `audit.service.ts`, `auth.controller.ts`, etc.

### Validations

- `pnpm lint` : 100% vert (0 erreur, 0 avertissement).
- `pnpm typecheck` : 100% vert (0 erreur TypeScript).
- `pnpm test` : 100% vert (40 tests unitaires et d'intégration passants).
- `node scripts/check-file-size.mjs` : 100% conforme D-13 (74 fichiers analysés, 0 violation, 0 avertissement).
- `pnpm build` : Build complet (Next.js 15, NestJS 11, packages) réussi sans erreur.
- Démonstration manuelle de bout en bout validée (`apps/api/test/demo-auth.ts`).

---

## 2026-08-24 — Lot 4 : Catalogue & Leçons (B06 / US-02, US-03)

### Objectifs du lot

Implémentation de l'API Catalogue et de la lecture sécurisée des leçons Markdown côté backend NestJS, mise en place de l'authentification frontend minimale en mémoire (D-09) avec Next.js 15 App Router, et création des pages de consultation de catalogue, de détail de module et de lecture de leçon avec coloration Shiki et sanitization stricte (§30).

### Réalisations

- **API Catalogue (`apps/api/src/modules/catalog/`) protégée par `AuthGuard` (§22.2 / §29.2)** :
  - `GET /tracks` : Liste ordonnée des années de formation (`TrackSummaryDto`, progression agrégée réservée au Lot 6 avec `progress: null` documenté).
  - `GET /tracks/:slug/modules` : Modules d'une année ordonnés par position avec métadonnées complètes (`difficulty`, `estimatedMinutes`, `competencyRefs`).
  - `GET /modules/:slug` : Détail d'un module avec leçons ordonnées, quiz (sans réponses correctes) et labs associés.
  - `GET /lessons/:slug` : Métadonnées complètes de la leçon et contenu Markdown lu de manière sécurisée.
- **Sécurité anti-traversée de chemin (`LessonReaderService`)** :
  - Confinement strict dans `CONTENT_PATH` : résolution absolue, normalisation, rejet des `..`, détection et rejet des injections de caractères nuls (`\0`).
  - Extraction automatique du corps Markdown et élimination du frontmatter YAML pour un affichage propre côté client.
- **Cache mémoire process (`CatalogCacheService` — §41)** :
  - Mise en cache in-memory des tracks, modules et leçons pour respecter le budget de latence LAN < 1.5s / API p95 < 300ms.
  - Invalidation globale du cache branchée lors de la synchronisation de contenu (`executeContentSync`).
- **Frontend Authentification minimale (`apps/web/lib/auth/`)** :
  - `AuthContext` : Access token stocké en **MÉMOIRE VIVE UNIQUEMENT** (D-09, jamais dans `localStorage` ni `sessionStorage`).
  - Restauration de session transparente au montage via `POST /api/v1/auth/refresh` (cookie `SameSite=Lax` transmis automatiquement).
  - Rewrites proxy Next.js (`next.config.ts`) : `/api/:path*` réécrit vers le backend pour assurer le fonctionnement same-origin sans CORS complexe.
  - `LoginForm` (`apps/web/components/auth/login-form.tsx`) : Validation React Hook Form + Zod, affichage des erreurs RFC 7807 (`application/problem+json`).
  - `ProtectedRoute` (`apps/web/components/auth/protected-route.tsx`) : Redirection automatique vers `/login` avec conservation de l'URL de redirection en cas d'absence de session.
- **Pages Catalogue & Rendu Markdown sécurisé (`apps/web`)** :
  - `/catalogue` : Navigation par année avec cartes de modules (`ModuleCard`), badges de difficulté, durées et codes du référentiel BTS.
  - `/catalogue/[moduleSlug]` : Page de détail du module (`ModuleHeader`, `ModuleLessonsList`, `ModuleQuizzesList`, `ModuleLabsList`).
  - `/catalogue/[moduleSlug]/[lessonSlug]` : Rendu du cours avec `react-markdown` + `rehype-sanitize` (liste blanche stricte de balises autorisées), coloration syntaxique avec `shiki` (`CodeBlock` avec bouton copie), liens externes en `target="_blank" rel="noopener noreferrer"`.
  - Layout & Navigation (`Navbar`, `Breadcrumbs`) avec statut d'authentification et déconnexion.
- **Conformité stricte D-13 / RM-13** :
  - 117 fichiers analysés, 0 avertissement (≥ 300 lignes), 0 violation (> 400 lignes).
  - Découpage modulaire par responsabilité : `components/catalog/`, `components/lessons/`, `components/auth/`, `components/layout/`, `lib/auth/`, `lib/api/`.

### Validations

- `pnpm lint` : 100% vert (0 erreur, 0 avertissement sur l'ensemble du monorepo).
- `pnpm typecheck` : 100% vert (0 erreur TypeScript).
- `pnpm test` : 100% vert (69 tests unitaires et d'intégration passants).
- `node scripts/check-file-size.mjs` : 100% conforme D-13 (117 fichiers analysés).
- `pnpm build` : Build complet Next.js 15 (App Router) et NestJS 11 réussi avec succès.
- Démonstration de bout en bout validée (`apps/api/test/demo-lot4.ts` et `pnpm content:sync`).


