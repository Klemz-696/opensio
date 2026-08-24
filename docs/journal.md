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

## Déviations acceptées (Lot 3)

- Token CSRF double-soumission (§30) non implémenté : mitigé par SameSite=Lax
  (le navigateur n'envoie pas le cookie sur POST cross-site) + API JSON pure.
  À réévaluer en v0.2 si surface d'attaque accrue.
- Rate limiting global 100 req/min/IP (§30) non implémenté : limites par route
  sensible (5/min) uniquement. Justification : homelab mono-instance, LAN/VPN.

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
  - Constructeur sans injection de primitive afin d'assurer l'instanciation propre par le conteneur DI NestJS.
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
  - Exception documentée au §30 : `dangerouslySetInnerHTML` dans `CodeBlock` alimenté exclusivement par `codeToHtml` (Shiki) qui échappe le contenu texte par construction ; aucun HTML brut issu du Markdown n'entre dans ce composant.
  - Layout & Navigation (`Navbar`, `Breadcrumbs`) avec statut d'authentification et déconnexion.
- **Tests & Robustesse** :
  - Ajout de `app-boot.e2e.spec.ts` pour valider la compilation et l'initialisation du conteneur DI complet (`AppModule`).
- **Conformité stricte D-13 / RM-13** :
  - 118 fichiers analysés, 0 avertissement (≥ 300 lignes), 0 violation (> 400 lignes).

### Validations

- `pnpm lint` : 100% vert (0 erreur, 0 avertissement sur l'ensemble du monorepo).
- `pnpm typecheck` : 100% vert (0 erreur TypeScript).
- `pnpm test` : 100% vert (88 tests unitaires, d'intégration et de démarrage passants).
- `node scripts/check-file-size.mjs` : 100% conforme D-13 (118 fichiers analysés).
- `pnpm build` : Build complet Next.js 15 (App Router) et NestJS 11 réussi avec succès.
- Démarrage réel de l'API et réponse de `GET /api/v1/health` validés.

---

## 2026-08-24 — Lot 5 : Quiz interactifs (B07 / US-04, US-05)

### Objectifs du lot

Implémentation complète des quiz interactifs d'auto-évaluation conformément aux règles métier RM-01 (seuil de validation, tentatives illimitées), RM-06 (non-régression), RM-12 (audit), RM-13 / D-13 (taille de fichiers), §19, §22.3, §29.2 et §30 (zéro fuite de données confidentielles).

### Réalisations

- **API Quizzes (`apps/api/src/modules/quizzes/`) protégée par `AuthGuard` (§22.3 / §29.2)** :
  - `GET /quizzes/:slug` : renvoie le quiz avec ses questions et choix ordonnés pour la passation.
  - **Garantie Zéro-Fuite absolue** : exclusion stricte de `correctChoiceIds`, `correct_choice_ids` et `explanation` dans le DTO `QuizDetailDto` et les réponses d'erreur.
  - `POST /quizzes/:slug/attempts` : soumission des réponses (`SubmitQuizAttemptDto`), correction stricte côté serveur, calcul du score en pourcentage et évaluation de la réussite par rapport au seuil (`passingScore`, défaut 80 %).
  - `GET /quizzes/:slug/attempts` : consultation de l'historique complet des tentatives de l'étudiant connecté.
- **Moteur de notation pur (`QuizScoringService`)** :
  - Question `single` : validation exacte de la réponse unique.
  - Question `multiple` : comparaison stricte des ensembles de choix (même cardinalité et inclusion mutuelle exacte). Choix partiel = 0 point ; choix avec intrus = 0 point.
  - Score global : $\text{Math.round}((C / N) \times 100)$ et validation `passed = score >= quiz.passingScore`.
  - Construction du DTO `QuizAttemptResultDto` incluant `isCorrect` et l'`explanation` pédagogique de chaque question (toujours sans `correctChoiceIds`).
- **Idempotence & Protection anti-double soumission (`QuizIdempotencyService`)** :
  - Prise en compte de l'en-tête `Idempotency-Key` ou déduplication automatique par hash du payload pour éviter les doublons d'essais lors de clics répétés ou retries réseau.
  - Gestion des requêtes concurrentes en vol (attente de la promesse sans duplication de ligne en base).
- **Journalisation d'audit (RM-12)** :
  - Enregistrement de l'événement `QUIZ_ATTEMPT_SUBMITTED` via `AuditService` avec métadonnées (`score`, `passed`, `passingScore`, `quizSlug`, `attemptId`).
- **Frontend Interactif Next.js 15 (`apps/web`)** :
  - Activation de la passation depuis le détail du module (`ModuleQuizzesList` avec lien direct et bouton "Passer le quiz").
  - Route `/catalogue/[moduleSlug]/quiz/[quizSlug]` avec protection `ProtectedRoute` et fil d'Ariane dynamique.
  - Composant `QuizRunner` : questions rendues en Markdown via `MarkdownRenderer`, sélecteurs différenciés (`input` radio pour choix unique / checkbox pour choix multiples), barre de progression animée et bouton "Valider mes réponses" avec spinner et état désactivé pendant la soumission.
  - Composant `QuizResultView` : bandeau de score dynamique avec jauge et badge de validation (vert émeraude) / échec (rose), explications pédagogiques détaillées pour chaque question, et bouton pour retenter immédiatement.
  - Skeletons de chargement animés et accessibles (`QuizPageLoading` avec attributs `role="status"` et `aria-busy="true"`).
- **Conformité stricte D-13 / RM-13** :
  - 143 fichiers analysés, 0 avertissement (≥ 300 lignes), 0 violation (> 400 lignes).

### Validations

- `pnpm lint` : 100% vert (0 erreur, 0 avertissement sur l'ensemble du monorepo).
- `pnpm typecheck` : 100% vert (0 erreur TypeScript).
- `pnpm test` : 100% vert (109 tests unitaires, d'intégration, de démarrage et frontend passants).
- `node scripts/check-file-size.mjs` : 100% conforme D-13 (143 fichiers analysés).
- `pnpm build` : Build de production Next.js 15 App Router (`/catalogue/[moduleSlug]/quiz/[quizSlug]`) et NestJS 11 réussi avec succès.
- Script de démonstration de bout en bout exécuté et validé avec succès (`pnpm --filter @opensio/api exec tsx test/demo-lot5.ts`).

### Décisions & Arbitrages (Lot 5)

- **Gestion des collisions d'idempotence** : Si une requête `POST /quizzes/:slug/attempts` arrive avec une `Idempotency-Key` déjà traitée :
  - Si le corps de réponses est identique $\rightarrow$ renvoi immédiat du résultat d'origine mis en cache (status 200/201, 0 écriture en base).
  - Si le corps de réponses est différent $\rightarrow$ rejet immédiat avec code **422 Unprocessable Entity** (RFC 7807) pour signaler l'incohérence des paramètres.
  - Dans tous les cas, **aucune seconde tentative n'est créée en base sous la même clé**.
- **Cache d'idempotence en mémoire vive (in-process)** : Le cache de déduplication réside en mémoire vive du processus API (TTL 5 min). En cas de redémarrage du conteneur API, le cache se vide et un retry réseau ultérieur créerait une nouvelle tentative en base. Cette limite est pleinement acceptée pour notre contexte homelab/LAN mono-instance et pédagogique (Redis et files distribuées étant réservés au jalon v0.2).

---

## 2026-08-24 — Lot 6 : Progression & Tableau de bord (B08 / US-06, US-07, US-08)

### Objectifs du lot

Implémentation complète du suivi de progression de l'étudiant et du tableau de bord personnel conformément aux règles métier RM-01, RM-02, RM-03 (règle de complétion de module), RM-12 (journalisation), RM-13 / D-13 (taille des fichiers), §19, §22.4 et §29.2 du Blueprint contractuel.

### Réalisations

- **Module de Progression (`apps/api/src/modules/progress/`)** :
  - `POST /lessons/:slug/complete` : Marque une leçon comme terminée avec cumul de temps passé (`CompleteLessonDto`). Idempotent (upsert sur la clé composite `(userId, lessonId)`). Le `userId` provient **exclusivement du JWT** (aucun paramètre client).
  - `POST /lessons/:slug/heartbeat` : Enregistrement incrémental du temps passé en lecture (paliers de 15 à 300 secondes).
  - `GET /lessons/:slug/progress` : Consultation du statut de lecture et du temps passé sur une leçon donnée.
  - `GET /me/progress` : Arbre complet de progression structuré en Tracks > Modules > Leçons avec pourcentages et indicateurs d'achèvement.
  - `GET /me/activity` : Flux paginé des événements d'activité de l'utilisateur connecté.
- **Service d'Agrégation Optimisé anti-N+1 (`ProgressAggregationService`)** :
  - Requêtes groupées uniques sur `LessonProgress` et `QuizAttempt` par `userId`.
  - Calcul en mémoire pure de l'arbre de progression : totaux, leçons terminées, quiz validés, modules complétés (RM-03) et temps total.
  - Zéro boucle de requêtes N+1 en base.
- **Enrichissement dynamique du Catalogue sans pollution de cache (`CatalogProgressEnricherService`)** :
  - `CatalogCacheService` reste un cache process **global et statique** sans données utilisateur.
  - `CatalogProgressEnricherService` décore à la volée les réponses du catalogue (`/tracks`, `/tracks/:slug/modules`, `/modules/:slug`, `/lessons/:slug`) avec la progression de l'utilisateur connecté lorsque le token JWT est présent.
- **Moteur de Recommandations Pédagogiques (`RecommendationsService`)** :
  - Détection des quiz échoués $\rightarrow$ suggestion de retenter le quiz (RM-01).
  - Détection des modules dont toutes les leçons sont lues mais sans quiz validé $\rightarrow$ suggestion de passer le quiz (RM-03).
  - Détection des modules en cours $\rightarrow$ suggestion de la prochaine leçon non terminée.
- **Tableau de bord personnel (`apps/api/src/modules/dashboard/` & `GET /me/dashboard`)** :
  - Vue synthétique consolidée : synthèse globale (`overview`), section « Reprendre où j'en étais » (`resume`), progression par cursus/année (`tracksProgress`), derniers résultats de quiz (`recentQuizzes`), flux d'activité récente (`recentActivity`), et recommandations personnalisées (`recommendations`).
- **Journalisation de l'Activité (`ActivityEvent`)** :
  - Enregistrement des événements `LESSON_STARTED`, `LESSON_COMPLETED`, `QUIZ_PASSED`, `QUIZ_ATTEMPTED` pour alimenter le flux chronologique.
- **Frontend Interactif & Dashboard Next.js 15 (`apps/web`)** :
  - Route `/dashboard` : Page d'accueil apprenant complète, protégée par `ProtectedRoute`, avec squelettes de chargement accessibles (`role="status"`, `aria-busy="true"`).
  - Composants modulaires (`DashboardHeader`, `DashboardStats`, `DashboardResume`, `DashboardRecommendations`, `DashboardTracks`, `DashboardQuizzes`, `DashboardActivity`).
  - Composant `LessonCompleteButton` (`apps/web/components/lessons/lesson-complete-button.tsx`) : Bouton d'action interactif avec état visuel validé (vert émeraude, date de validation, icône check) et gestion des erreurs.
  - Hook `useLessonHeartbeat` (`apps/web/lib/hooks/use-lesson-heartbeat.ts`) : Envoi automatique du signal de présence toutes les 30s lors de la lecture active.
  - Intégration du catalogue : Jauges de progression et badges « Validé » dans `ModuleCard`, coches vertes dans `ModuleLessonsList`, et scores dans `ModuleQuizzesList`.
  - Navigation : Ajout de « Tableau de bord » dans `Navbar` et redirection automatique vers `/dashboard` pour les utilisateurs connectés sur `/`.
- **Tests & Robustesse** :
  - Tests d'isolation inter-utilisateurs stricte (User A vs User B) validés dans `progress.e2e.spec.ts`.
  - 154 tests automatisés passants sur l'ensemble du monorepo (103 API, 33 Web, 18 Content-Schema).
- **Conformité stricte D-13 / RM-13** :
  - 177 fichiers analysés, 0 avertissement (≥ 300 lignes), 0 violation (> 400 lignes).

### Validations

- `pnpm lint` : 100% vert (0 erreur, 0 avertissement sur l'ensemble du monorepo).
- `pnpm typecheck` : 100% vert (0 erreur TypeScript).
- `pnpm test` : 100% vert (154 tests unitaires, d'intégration et frontend passants).
- `node scripts/check-file-size.mjs` : 100% conforme D-13 (177 fichiers analysés).
- `pnpm build` : Build de production Next.js 15 App Router (`/dashboard`, `/catalogue`, etc.) et NestJS 11 réussi avec succès.
- Script de démonstration de bout en bout exécuté et validé avec succès (`pnpm --filter @opensio/api exec tsx test/demo-lot6.ts`).

### Décisions & Arbitrages (Lot 6)

- **Séparation Stricte du Cache Global et de la Progression Utilisateur** : Le cache `CatalogCacheService` stocke les objets du catalogue avec `progress: null` pour servir de référence rapide partagée entre tous les processus et utilisateurs. L'enrichissement avec les données de progression utilisateur se fait systématiquement hors du cache par `CatalogProgressEnricherService`, garantissant l'absence totale de fuite de données inter-utilisateurs par effet de cache.
- **Règle RM-03 de complétion de module** : Un module est considéré comme complété si et seulement si toutes ses leçons sont au statut `COMPLETED` ET (si le module comporte des quiz) au moins un quiz a été réussi (`passed = true`).
- **Extraction du `userId` exclusivement depuis le JWT** : Conformément aux spécifications de sécurité (§29.2), aucun identifiant utilisateur n'est accepté dans le corps ou les paramètres de requête ; il est extrait de manière inviolable depuis le payload du token JWT validé par le `AuthGuard`.

## [Lot 7] — Ateliers pratiques (Labs) & Runner de validation

**Date** : 24/08/2026  
**Branche** : `feat/b09-labs-runner`  
**Objectif** : Ateliers pratiques (Labs) complets, cycle de vie des sessions avec machine à états stricte, intégration du runner simulé (`LAB_RUNNER=simulation`) derrière une interface découplée (`LabRunner`), validation serveur zéro-fuite, barème/indices pénalisés (RM-04 / RM-05), expiration TTL automatique (RM-09), interface apprenant Next.js 15 avec éditeur multi-fichiers, accordéon d'indices et verdict en temps réel.

### Réalisations

- **Architecture du Runner Découplé (`LabRunner` & `SimulationLabRunner`)** :
  - Définition du contrat `LabRunner` (`runners/lab-runner.interface.ts`) avec token d'injection NestJS `LAB_RUNNER_TOKEN`.
  - Implémentation `SimulationLabRunner` (`runners/simulation-lab-runner.service.ts`) :
    - Création d'un répertoire temporaire sandbox isolé par session (`os.tmpdir()/opensio-labs/<sessionId>`).
    - Copie des fichiers d'amorce (`files/`) et écriture des fichiers édités.
    - Exécution du validateur `validator/validate.mjs` dans un sous-processus `node` isolé avec timeout strict (30s) et parsing du rapport JSON structuré.
    - Nettoyage sécurisé du sandbox à la terminaison de la session.
- **Sécurité Zéro-Fuite & Zéro Injection (RM-12 / §22.5 / §29.2)** :
  - `GET /api/v1/labs/:slug` : Fournit uniquement les métadonnées publiques, le nombre d'indices et leur coût en pourcentage. ZÉRO texte d'indice, ZÉRO code de validateur, ZÉRO fixture de solution divulgués.
  - Protection anti-path traversal stricte sur les fichiers sauvegardés (`..`, chemins absolus rejetés avec HTTP 400).
  - Isolation inter-utilisateurs garantie : un utilisateur ne peut ni consulter, ni modifier, ni valider la session d'un autre utilisateur (HTTP 403 Forbidden).
  - Extraction inviolable du `userId` exclusivement depuis le token JWT signé.
- **Cycle de Vie & Machine à États des Sessions (`LabSessionsService`)** :
  - États stricts gérés : `RUNNING` $\rightarrow$ `PASSED` / `FAILED` / `EXPIRED` / `CLEANED`.
  - Démarrage de session (`POST /labs/:slug/sessions`) avec calcul du TTL (RM-09).
  - Sauvegarde des fichiers de travail (`PUT /labs/:slug/sessions/:id/files`).
  - Système d'indices pénalisés (`POST /labs/:slug/sessions/:id/hint`) : calcul du barème selon RM-05 (`cost_percent` déduit, plancher de score `floor_percent` respecté).
  - Arrêt explicite de session (`POST /labs/:slug/sessions/:id/stop`).
  - Découpage D-13 respecté : extraction du service de formatage des DTOs `LabSessionFormatterService` (`lab-session-formatter.service.ts`).
- **Validation Serveur & Notation (`LabValidationService` & `LabScoringService`)** :
  - Validation serveur complète (`POST /labs/:slug/sessions/:id/validate`) exécutée par le runner.
  - Moteur de notation conforme à RM-04 (critères obligatoires requis, bonus optionnels) et RM-05 (déduction des pénalités d'indices sur le score final).
  - Enregistrement des événements `LabEvent` (`VALIDATION_RUN`, `PASSED`, `FAILED`, `FILE_SAVED`, `HINT_USED`, `EXPIRED`, `CLEANUP`) et journalisation d'audit / activité (`ActivityEvent` `LAB_COMPLETED`).
- **Endpoints REST API (`LabsController` — `/api/v1/labs`)** :
  - `GET /labs/:slug` : Détail public d'un lab avec Zéro-Fuite.
  - `POST /labs/:slug/sessions` : Démarrage / reprise d'une session active.
  - `GET /labs/:slug/sessions/:id` : Consultation de l'état de la session et des fichiers.
  - `PUT /labs/:slug/sessions/:id/files` : Sauvegarde des fichiers de travail.
  - `POST /labs/:slug/sessions/:id/validate` : Soumission pour validation serveur par le runner.
  - `POST /labs/:slug/sessions/:id/hint` : Déblocage du prochain indice avec pénalité.
  - `POST /labs/:slug/sessions/:id/stop` : Abandon / nettoyage de session.
- **Frontend Apprenant Next.js 15 (`apps/web`)** :
  - Route `/catalogue/[moduleSlug]/labs/[labSlug]` : Page interactive complète avec breadcrumbs et gestion d'état réactive.
  - `LabHeader` : En-tête avec badges de niveau, durée estimée, barème et statut de session en temps réel.
  - `LabSessionControls` : Barre d'action avec compte à rebours TTL dynamique, boutons de sauvegarde, validation et abandon.
  - `LabEditor` : Éditeur de code et fichiers tabulaire avec coloration, réinitialisation et indicateur d'enregistrement.
  - `LabHints` : Accordéon d'indices pédagogiques avec avertissement de pénalité et confirmation de déblocage (RM-05).
  - `LabVerdict` : Rapport d'évaluation détaillée affichant les points obtenus, les contrôles réussis/échoués et les retours explicatifs.
  - `LabContext` : Scénario d'entreprise, objectifs pédagogiques cochables et critères d'évaluation.
  - Squelette de chargement accessible (`loading.tsx`) avec attributs `role="status"` et `aria-busy="true"`.
  - Intégration dans le catalogue (`ModuleLabsList`) avec liens d'accès directs aux labs et timeline d'activité (`DashboardActivity`) avec icônes de lab.
- **Tests & Démonstration Réelle** :
  - Suite de tests unitaires et d'intégration API (`lab-scoring.service.spec.ts`, `lab-sessions.service.spec.ts`, `labs.e2e.spec.ts`).
  - Suite de tests frontend Web Vitest (`lab-hints.spec.tsx`, `lab-verdict.spec.tsx`, `lab-editor.spec.tsx`, `loading-skeletons.spec.tsx`).
  - Script de démonstration réseau réelle HTTP (`apps/api/test/demo-lot7.ts`) validant l'ensemble du cycle avec 2 utilisateurs JWT, l'isolation inter-utilisateurs et le tableau de bord.
  - 181 tests automatisés passants sur l'ensemble du monorepo (122 API, 41 Web, 18 Content-Schema).

### Validations

- `pnpm lint` : 100% vert (0 erreur, 0 avertissement sur l'ensemble du monorepo).
- `pnpm typecheck` : 100% vert (0 erreur TypeScript).
- `pnpm test` : 100% vert (181 tests unitaires, d'intégration et frontend passants).
- `node scripts/check-file-size.mjs` : 100% conforme D-13 (205 fichiers analysés, 0 violation > 400 lignes).
- `pnpm build` : Build de production Next.js 15 App Router et NestJS 11 réussi avec succès.
- Démonstration HTTP de bout en bout exécutée et validée avec succès (`pnpm --filter @opensio/api exec tsx test/demo-lot7.ts`).

### Décisions & Arbitrages (Lot 7)

- **Abstraction et Découplage du Runner (`LabRunner`)** : En accord avec les spécifications (§19 et §22.5), l'exécution de la validation est complètement découplée du backend via l'interface `LabRunner` et le token d'injection `LAB_RUNNER_TOKEN`. L'implémentation par défaut `SimulationLabRunner` exécute les validateurs dans un bac à sable temporaire local avec sous-processus isolé. En v0.2+, une implémentation `DockerLabRunner` ou `MicrovmLabRunner` pourra remplacer ce service de manière transparente sans aucune modification des contrôleurs ou des services métier.
- **Sécurité Zéro-Fuite Stricte (RM-12)** : Les routes publiques ne divulguent aucun texte d'indice ni aucun code de script validateur. Les indices ne sont débloqués qu'un par un à la demande expresse de l'utilisateur avec enregistrement de la pénalité de score en base.
- **Isolation et Immuabilité Post-Validation** : Une fois la session validée avec succès (`PASSED`), aucune modification de fichier ou déblocage d'indice n'est autorisé. Toute tentative d'accès non autorisé par un tiers est rejetée par une erreur 403 Forbidden.
- **Gestion des Sandboxes Orphelines & Sweeper Périodique (`LabSessionSweeperService`)** : Pour éviter l'accumulation de dossiers temporaires sur le disque (`os.tmpdir()/opensio-labs/<sessionId>`) en cas d'abandon de session sans appel à `/stop` (ou si l'apprenant ne revient jamais sur la plateforme), un service dédié `LabSessionSweeperService` effectue un balayage proactif au démarrage puis toutes les 5 minutes. Toutes les sessions en statut `RUNNING` dont le TTL est dépassé sont basculées en statut `EXPIRED` et leur bac à sable sur disque est immédiatement purgé par le runner.

## 2026-08-24 — Incident : Résolution runtime de `@opensio/content-schema` non compilé

- **Symptôme** : Au lancement de l'API (`nest start --watch` ou `node dist/main.js`), échec avec `ERR_MODULE_NOT_FOUND` sur `packages/content-schema/src/track.js` importé depuis `src/index.ts`.
- **Diagnostic** : Le Lot 7 a introduit le premier import *runtime* de `@opensio/content-schema` dans l'API NestJS (`LabsService` chargeant `LabSchema` pour validation Zod). Le package était configuré avec `build = tsc --noEmit` sans émission `dist/` et ses imports relatifs ESM en `.js` n'étaient pas résolubles par Node en exécution standard. Les outils de test/dev à la volée (`tsx`, `vitest`) masquaient cette anomalie en compilant les sources TypeScript à la volée.
- **Correction appliquée** :
  1. `packages/content-schema` : Ajout d'une compilation TypeScript réelle (`tsconfig.build.json`) émettant `.js`, `.d.ts` et sourcemaps vers `dist/`.
  2. `packages/content-schema/package.json` : Pointage de `main`, `types` et `exports` vers `./dist/index.js` et `./dist/index.d.ts`.
  3. `turbo.json` : La tâche `dev` de l'API et du monorepo dépend désormais explicitement de la compilation des packages internes amont (`^build`).
  4. `apps/api` : Ajout de `tsconfig.build.json` ciblant `rootDir: ./src` pour produire un artefact propre `dist/main.js` sans pollution des fichiers de tests.
- **Note de Backlog (Qualité & CI)** :
  - Ajouter une étape de smoke test en CI exécutant directement l'artefact compilé de production (`node dist/main.js` + interrogation du endpoint `GET /health` ou `GET /api/v1/health`) afin de bloquer systématiquement toute régression liée à la résolution des modules compilés.





