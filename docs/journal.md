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

---

## [Lot 8] — Terminal & Assistant IA

**Date** : 25/08/2026  
**Branche** : `feat/b09-terminal-ai`  
**Objectif** : Implémentation du Terminal Virtuel Interactif sécurisé par liste blanche de commandes et de l'Assistant Mentor IA avec tuteur pédagogique, architecture double mode (Ollama local / OpenAI distant), garde-fous zéro-fuite (RM-11) et rate limiting strict.

### Réalisations

- **Base de Données & Migration Prisma (`apps/api/prisma`)** :
  - Création du sous-schéma `apps/api/prisma/schema/chat.prisma` modélisant `ChatConversation` et `ChatMessage` avec l'enum `ChatRole` (`USER`, `ASSISTANT`, `SYSTEM`).
  - Extension de `apps/api/prisma/schema/labs.prisma` avec l'événement `TERMINAL_COMMAND` dans `LabEventKind`.
  - Migration SQL `20260824221907_lot8_terminal_ai` appliquée sur PostgreSQL.
- **Module Terminal Virtuel Sécurisé Backend (`apps/api/src/modules/terminal`)** :
  - `SimulationCommandInterpreter` : Interpréteur avec **liste blanche stricte** de commandes autorisées (`help`, `ls`, `cat`, `cd`, `pwd`, `ip`, `ping`, `systemctl`, `ss`, `netstat`, `df`, `free`, `ps`, `clear`, `date`).
  - **SÉCURITÉ CRITIQUE** : Zéro exécution de commandes arbitraires (`exec`/`spawn`/`eval`) sur l'entrée utilisateur. Toute commande hors liste blanche est immédiatement rejetée avec le code d'erreur standard 127.
  - `SimulatedFilesystemService` : Navigation sécurisée (`cd`, `ls`, `cat`, `pwd`) strictement bornée au bac à sable de la session (`baseTempDir/<sessionId>`) avec protection contre le traversée de répertoires (`..`).
  - `SimulatedNetworkService` : Simulation réaliste de l'état système Debian 12 et des configurations réseaux BTS SISR.
  - `TerminalService` : Contrôle d'accès et d'appartenance de la session de lab (statut `RUNNING`), journalisation détaillée dans `LabEvent` (`TERMINAL_OPENED`, `TERMINAL_COMMAND`).
  - `TerminalGateway` : Passerelle WebSocket `/ws/terminal` avec authentification par token JWT HS256, isolation inter-utilisateurs et heartbeat ping/pong (D-14).
  - `TerminalController` : Endpoints REST sécurisés (`GET /labs/:slug/sessions/:id/terminal`, `POST .../exec`).
- **Module Assistant Mentor IA Backend (`apps/api/src/modules/ai`)** :
  - Contrat d'interface `AiProvider` avec token d'injection `AI_PROVIDER_TOKEN`.
  - `OpenAiCompatibleProvider` : Provider double mode unifié compatible avec l'API OpenAI et **Ollama en local** (`http://localhost:11434/v1`, modèle `llama3.1:8b` par défaut) pour une confidentialité totale 0-data partagée (D-16).
  - `NullProvider` : Provider inactif propre retournant des messages pédagogiques d'aide dégradés si l'IA est désactivée.
  - `AiContextSanitizerService` : Injection exclusive des métadonnées publiques et consignes de tuteur Socratique (guide méthodologique, questions d'orientation). **Zéro injection des scripts validateurs, fichiers de solution ou correctChoiceIds**.
  - `AiSolutionFilterService` : Filtre post-traitement interceptant toute tentative de divulgation de solution complète (RM-11) et la remplaçant par un refus pédagogique constructif.
  - `AiRateLimiterService` : Limitation glissante stricte à 20 requêtes par heure et par utilisateur avec calcul du quota restant.
  - `ChatService` : Gestion des conversations, historique des 20 derniers messages, audit d'utilisation (`CHAT_MESSAGE_SENT`) et bandeau de conformité RGPD.
  - `AiController` : Endpoints REST (`GET /chat/status`, `GET /chat/conversations`, `POST /chat/conversations`, `GET /chat/conversations/:id/messages`, `POST /chat/conversations/:id/messages`, `DELETE /chat/conversations/:id`).
- **Frontend Apprenant Next.js 15 (`apps/web`)** :
  - `LabTerminal` : Terminal interactif avec barre d'état, invite `student@opensio-lab:~$ `, historique de commandes (touches Flèche Haut / Bas), raccourcis de commandes fréquentes et scrolling automatique.
  - Intégration ergonomique dans la page de lab `/catalogue/[moduleSlug]/labs/[labSlug]` avec un sélecteur d'onglets réactif entre **« Éditeur de fichiers »** et **« Terminal interactif »**.
  - `MentorChatDrawer` : Tiroir latéral flottant d'assistance IA avec indicateur de quota, sélection de discussions, badge de confidentialité Ollama Local et zone de saisie ergonomique.
- **Tests & Démonstration Réelle HTTP** :
  - Tests unitaires et d'intégration : `simulation-command-interpreter.spec.ts`, `terminal.service.spec.ts`, `terminal.gateway.spec.ts`, `ai-solution-filter.spec.ts`, `ai-rate-limiter.spec.ts`, `ai-context-sanitizer.spec.ts`, `openai-compatible-provider.spec.ts`, `chat.e2e.spec.ts`.
  - Tests frontend Web : `lab-terminal.spec.tsx`, `mentor-chat.spec.tsx`.
  - Script de démonstration réseau réelle HTTP (`apps/api/test/demo-lot8.ts`) : 13 étapes validant l'authentification JWT de 2 utilisateurs, l'isolation inter-utilisateurs, le blocage des commandes hors liste blanche, le refus de spoil par l'IA (RM-11), le rate limiting et la journalisation en base PostgreSQL.
  - **207 tests automatisés passants à 100%** sur l'ensemble du monorepo (160 API, 47 Web).

### Validations

- `pnpm lint` : 100% vert (0 erreur, 0 avertissement).
- `pnpm typecheck` : 100% vert (0 erreur TypeScript).
- `pnpm test` : 100% vert (207 tests unitaires, d'intégration, E2E et frontend passants).
- `node scripts/check-file-size.mjs` : 100% conforme D-13 (248 fichiers analysés, 0 violation > 400 lignes).
- `pnpm build` : Build de production Next.js 15 App Router et NestJS 11 validé avec succès.
- Démonstration HTTP réelle `demo-lot8.ts` validée avec succès.

---

## [Lot 8 — Correctifs & Évolutions] Module IA : Timeout Configurable, Préférences Étudiant, Détection de Contournement & Mentor Global

**Date** : 25/08/2026  
**Branche** : `feat/b09-terminal-ai`  
**Objectif** : Stabilisation et enrichissement du module IA : gestion fine du timeout et chargement de modèle en RAM, correction des clés React, résolution de contexte serveur, intégration du Mentor Global et des préférences utilisateur (modèle préféré, Mode Libre sécurisé, traçage d'audit).

### Réalisations

- **Correctif 1 — Timeout Configurable & Chargement en RAM (`AI_TIMEOUT_MS`)** :
  - Ajout de `AI_TIMEOUT_MS` (défaut 120 000 ms = 120s) dans `env.validation.ts` et `.env.example`.
  - Documentation du piège de résolution `localhost` vs `127.0.0.1` sous Windows (IPv6 `::1` vs IPv4 Ollama).
  - Gestion distincte de l'`AbortError` / Timeout dans `OpenAiCompatibleProvider` avec message explicite de chargement en RAM et journalisation de la cause réelle de l'échec.
- **Correctif 2 — Élimination du Warning React Duplicate Key** :
  - Réconciliation optimiste des identifiants de messages dans `mentor-chat-drawer.tsx` et clés de rendu uniques composées (`key={`${msg.id}-${idx}`}`) dans `mentor-chat-messages.tsx`.
- **Évolution 3 — Contexte Résolu Côté Serveur & Détection de Contournement (RM-11)** :
  - Transmission des métadonnées de page (`pageType`, `pageSlug`, `labSlug`, `quizSlug`, `lessonSlug`, `moduleSlug`) par le client web.
  - Résolution d'entité et association directe de la conversation en BDD par `AiContextSanitizerService`.
  - Application stricte des règles socratiques et du filtre de solution RM-11 en contexte évalué (lab / quiz noté).
  - Détection côté serveur des tentatives de contournement dans les conversations générales demandant la solution d'un lab du catalogue (`AiSolutionFilterService`), blocage automatique et journalisation de l'événement d'audit `AI_CIRCUMVENTION_ATTEMPT`.
- **Évolution 4 — Mentor Global Hors Évaluation** :
  - Disponibilité de l'assistant Mentor sur toutes les pages de la plateforme.
  - En contexte non-évalué (cours, module, révision générale), le Mentor répond de manière fluide et pédagogique sans restriction socratique artificielle.
- **Évolution 5 — Préférences Étudiant & Mode Libre Traçable** :
  - Ajout de la table PostgreSQL `user_ai_preferences` (`userId`, `preferredModel`, `freeMode`).
  - Endpoints REST : `GET /chat/models` (introspection dynamique via `/api/tags` d'Ollama ou `/models`), `GET /chat/preferences`, `PUT /chat/preferences`.
  - Le Mode Libre permet des explications complètes et du code direct **exclusivement hors contexte évalué** (strictement verrouillé et ignoré en lab/quiz noté).
  - Chaque bascule du Mode Libre est tracée dans l'audit log (`AI_FREE_MODE_TOGGLED`).
  - Découpage D-13 exemplaire du composant `MentorChatSettings` (< 400 lignes).

### Validations

- `pnpm lint` : 100% vert (0 erreur, 0 avertissement).
- `pnpm typecheck` : 100% vert (0 erreur TypeScript).
- `pnpm test` : 100% vert (**235 tests automatisés** : 169 API, 48 Web, 18 Content-Schema).
- `node scripts/check-file-size.mjs` : 100% conforme D-13 (252 fichiers analysés, 0 violation > 400 lignes).
- `pnpm build` : Build Next.js 15 App Router et NestJS 11 validé avec succès.
- Démonstration HTTP réelle `demo-lot8.ts` validée avec succès en 8 étapes complètes.

---

## [Lot v0.2] — Distribution & Déploiement : Installation en Une Commande, Stack Production Dockerisée & Sauvegardes D-18

**Date** : 25/08/2026  
**Branche** : `feat/b11-deploiement`  
**Objectif** : Fournir une expérience d'installation en une seule commande interactive guidée sur Windows, Linux et macOS, une stack de production Dockerisée durcie multi-stage avec reverse proxy Caddy HTTPS, parité stricte PostgreSQL 18 Alpine partout, conteneur de sauvegarde chiffrée quotidienne D-18 et runbook de restauration testé.

### Réalisations

- **1. Installateurs interactifs en une commande (`scripts/install.sh` & `scripts/install.ps1`)** :
  - **Linux / macOS (`curl -fsSL <url>/install.sh | bash`)** : réassignation automatique de stdin sur `/dev/tty` pour maintenir l'interactivité complète malgré l'exécution en pipe `curl | bash`.
  - **Windows (`irm <url>/install.ps1 | iex`)** : encodage robuste compatible PowerShell 5.1/7.
  - Détection automatique et validation des versions requises : Git, Node.js (≥ 22), pnpm (11.23.0), Docker Engine (démon joignable) avec proposition d'installation assistée (winget / apt / dnf / pacman / brew) avec consentement explicite.
  - Détection automatique d'Ollama et du modèle `llama3.1:8b` avec proposition de téléchargement ou message d'information transparent si absent.
  - Choix interactif du mode : **Mode Développement** (clone/update, `.env`, Docker dev DB, pnpm install, migrate, seed, content:sync) ou **Mode Production** (génération de secrets cryptographiques forts, `.env`, stack Compose prod, HTTPS Caddy).

- **2. Conteneurisation multi-stage durcie & Parité PostgreSQL 18** :
  - Parité stricte PostgreSQL 18 Alpine (`postgres:18-alpine`) alignée sur le développement, la CI GitHub Actions et la production.
  - `apps/api/Dockerfile` : multi-stage build `node:22-alpine` non-root (`node:node` UID 1000), exécution via `dumb-init`, point d'entrée `docker-entrypoint.sh` automatisant `prisma migrate deploy`, synchronisation du catalogue `content:sync` et sonde de santé `/api/v1/health`.
  - `apps/web/Dockerfile` : multi-stage build `node:22-alpine` non-root avec mode `output: 'standalone'` Next.js 15, assets statiques optimisés et sonde de santé `/api/health`.
  - Durcissement Compose (`docker-compose.prod.yml`) : `read_only: true`, `no-new-privileges:true`, `cap_drop: [ALL]`, limites strictes CPU/RAM (512 Mo à 1 Go), isolation sur réseaux Docker distincts (`opensio_edge` et `opensio_backend`), redémarrage `restart: unless-stopped`.
  - Base de données PostgreSQL isolée sur le réseau interne backend, strictement non exposée sur l'hôte.

- **3. Reverse Proxy Caddy & TLS Interne (D-06, D-17)** :
  - `infra/docker/Caddyfile` : Terminaison TLS automatique via autorité de certification interne (`tls internal`), en-têtes de sécurité HSTS, CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff.
  - Routage transparent des WebSockets (`Connection *Upgrade*`) vers l'API backend pour le terminal interactif des labs.

- **4. Sauvegardes Chiffrées & Restauration (D-18)** :
  - `scripts/backup.sh` : export `pg_dump` 18, compression gzip, chiffrement fort AES-256-CBC avec dérivation PBKDF2 (`openssl enc -aes-256-cbc -pbkdf2`), calcul d'empreinte d'intégrité SHA256 et rotation automatique sur 7 jours.
  - `scripts/restore.sh` : contrôle d'intégrité de la somme SHA256, déchiffrement à la volée, décompression et injection directe `psql` 18.
  - `infra/docker/backup/Dockerfile` : image conteneur basée sur `postgres:18-alpine` (avec client `pg_dump` 18 natif) et cron quotidien automatisé.

- **5. Validation de la Sécurité des Secrets (Zod)** :
  - `apps/api/src/config/env.validation.ts` : rejet formel au démarrage de toute clé `JWT_SECRET` utilisant un template par défaut (`change-this...`, `change-me...`), avec tests unitaires de validation dédiés.

- **6. Documentation & Runbooks d'Exploitation** :
  - `docs/installation.md` : Guide d'installation complet une-commande (dev et prod).
  - `docs/deployment.md` : Guide de déploiement en environnement Homelab / Proxmox VE (Debian 12, Caddy, certificats racines).
  - `docs/runbooks/restore.md` : Procédure de reprise d'activité (Disaster Recovery) et restauration pas à pas.
  - `README.md` : Mise en avant de l'installation une-commande dès l'en-tête du projet.

### Validations & Métriques

- `node scripts/check-file-size.mjs` : 100% conforme D-13 (255 fichiers analysés, 0 violation > 400 lignes).
- `pnpm lint` : 100% vert (0 erreur, 0 avertissement).
- `pnpm typecheck` : 100% vert (0 erreur TypeScript).
- `pnpm test` : 100% vert (**239 tests automatisés** : 173 API, 48 Web, 18 Content-Schema).
- **Vérification ShellCheck** : 100% vert dans un conteneur Debian 12 sur tous les scripts shell (`install.sh`, `backup.sh`, `restore.sh`, `entrypoint.sh`).
- **Syntaxe PowerShell** : 100% valide sur `install.ps1`.
- **Démonstration Réseau & Smoke Tests en Conteneurs de Production** :
  - Build multi-stage et démarrage complet de la stack Docker Compose de production (`opensio-caddy`, `opensio-web`, `opensio-api`, `opensio-db-prod`, `opensio-backup`).
  - Sondes de santé API `/api/v1/health` et Web `/api/health` en état `OK (status: ok)`.
  - Accès HTTPS complet via Caddy Reverse Proxy (pages d'accueil, assets, catalogue).
  - Exécution réelle du script de sauvegarde chiffrée `backup.sh` (génération de l'archive chiffrée AES-256 et de la somme SHA256).
  - Exécution réelle du script de restauration `restore.sh` avec vérification d'intégrité SHA256 et réinjection sans perte.

---

## 2026-08-25 — Correctifs & Durcissement Post-Tests Réels (Lot v0.2)

**Branche** : `feat/b11-deploiement`  
**Contexte** : Suite aux premiers tests d'installation en conditions réelles sur machine Windows (démon Docker arrêté, mise à jour d'un environnement existant avec secrets), quatre défauts ont été identifiés et corrigés :

### 1. Robustesse — Démon Docker injoignable & Encapsulation des commandes
- **Constat** : Lorsque Docker Desktop est installé mais arrêté (ou moteur planté / erreur 500 sur le named pipe), `install.ps1` plantait brutalement sur une `NativeCommandError` PowerShell.
- **Correction** :
  - Encapsulation de tous les appels système (`git`, `node`, `pnpm`, `docker`, `ollama`) via un exécuteur sécurisé (`Get-SafeCommandOutput` sous Windows et redirections protégées sous Bash).
  - Distinction formelle entre *« Docker non installé »* et *« Docker présent mais démon injoignable »*.
  - Dans le second cas : message clair, remédiation guidée selon l'OS (lancer Docker Desktop / `systemctl start docker`), et boucle d'attente animée avec retry et timeout (90s) avec reprise transparente du parcours d'installation.
  - Zéro stack trace brute atteignant l'utilisateur.

### 2. Déduplication des fichiers Compose
- **Constat** : `docker-compose.prod.yml` existait à la fois à la racine et dans `infra/docker/` avec un contenu redondant.
- **Correction** : Suppression du fichier doublon `infra/docker/docker-compose.prod.yml`. Le fichier racine `docker-compose.prod.yml` constitue désormais l'unique source de vérité canonique pour la production. Mise à jour de toutes les références dans les scripts, documentations et workflows CI.

### 3. Protection des secrets existants & Rotation consentie
- **Constat (Incident réel)** : L'installeur réécrivait inconditionnellement `DATABASE_URL` et `DB_PASSWORD` dans `.env` sans appliquer le changement à la base PostgreSQL vivante, provoquant une erreur d'authentification Prisma P1000 au boot suivant.
- **Correction** :
  - Sur une installation existante (`.env` présent), l'installeur préserve strictement tous les secrets existants (`DATABASE_URL`, `DB_PASSWORD`, `JWT_SECRET`, `BACKUP_ENCRYPTION_KEY`).
  - Toute régénération de secrets requiert désormais un consentement explicite avec avertissement d'impact.
  - En cas de régénération validée, l'installeur propose automatiquement d'appliquer le mot de passe à la base active via `ALTER USER` (`docker exec`), de réinitialiser le volume de données, ou de laisser l'administrateur gérer l'alignement.
  - Synchronisation automatique avec `apps/api/.env` si présent.

### 4. Parité stricte PostgreSQL 18 & Procédure de bascule Dev
- **Constat** : Le conteneur de dev était historiquement documenté en PostgreSQL 16 alors que la CI et la production tournent sous PostgreSQL 18 Alpine.
- **Correction** :
  - Alignement de `infra/docker/docker-compose.dev.yml` sur `postgres:18-alpine`.
  - Documentation dans `docs/installation.md` de la procédure de bascule dev (les données étant 100 % reproductibles via `pnpm db:migrate`, `pnpm seed` et `pnpm content:sync`).
  - Alignement de `README.md`.

### 5. Exécution de pnpm sous Windows & Contrôle de version (>= 9)
- **Constat** : Sous Windows, `pnpm` est installé sous forme de script externe (`pnpm.cmd` / `pnpm.ps1`). L'appel direct via `System.Diagnostics.Process` échouait silencieusement dans `Get-SafeCommandOutput`, produisant un affichage vide `[v] pnpm detecte : v`.
- **Correction** :
  - Encapsulation des commandes via `cmd.exe /c` dans `Get-SafeCommandOutput` pour résoudre correctement les scripts `.cmd`/`.bat`/`.ps1` et la variable `PATHEXT`.
  - Parsing robuste de la version avec suppression du préfixe éventuel `v` et contrôle de version majeure >= 9 (avec affichage conforme `v11.23.0` et proposition de mise à jour si la version est obsolète).
  - Aligné sur `scripts/install.sh` avec conformité ShellCheck 100 %.

---

## 2026-08-25 — Lot B12 : Refonte du Déploiement en Wizard Interactif 3 Phases

**Branche** : `feat/b12-wizard-installation`  
**Objectif** : Transformer l'installation d'OpenSIO en un parcours interactif complet structuré en trois phases (Analyse -> Configuration -> Exécution), avec support des 4 scénarios d'inférence IA, découpage modulaire sous `scripts/lib/` (conformité D-13), script dédié pour nœud Ollama distant, mode non interactif et mode simulation (`--dry-run`).

### Réalisations techniques

1. **Refonte modulaire de `scripts/install.sh`** :
   - Découpage par responsabilité sous `scripts/lib/` (chaque fichier respectant strictement la règle D-13 <= 400 lignes) :
     - `common.sh` : utilitaires de journalisation, prompts interactifs, comparateur sémantique de versions, générateur de secrets cryptographiques, exécuteur sécurisé compatible `--dry-run`.
     - `detect.sh` : Phase 1 — détection du système d'exploitation (Debian 12/13, Ubuntu 22.04+), vérification des prérequis avec le pattern détection -> affichage -> comparaison -> avertissement/remédiation (Docker >= 24.0, Compose >= 2.20, Git >= 2.30, Node >= 20, pnpm >= 9), analyse des ressources matérielles (RAM, vCPU, espace disque), sondage de disponibilité des ports réseau (5432, 6379, 3000, 4000, 80, 443) et détection d'installation existante.
     - `ollama.sh` : détection d'Ollama local sur l'hôte, sondage de nœuds distants via `GET /api/tags` avec timeout strict, vérification de présence du modèle (`llama3.1:8b`) et déclencheur de téléchargement distant via `POST /api/pull`.
     - `config.sh` : Phase 2 — questions interactives avec valeurs par défaut entre crochets, sélection du mode (dev/prod), 4 choix d'intégration Ollama (hôte, conteneur profil `ai`, distant, sans IA), domaine et certificat TLS (interne ou public ACME), ports personnalisables, gestion des mots de passe, politique de seed (complet, minimal, aucun), évaluation des ressources par scénario et récapitulatif tabulaire avant confirmation.
     - `runner.sh` : Phase 3 — exécution séquentielle sans interruption : clone/pull, génération du `.env`, démarrage des conteneurs Compose, attente des healthchecks (db, api, web), exécution des migrations Prisma, amorçage du seed choisi et synchronisation du référentiel pédagogique (D-02).
   - Point d'entrée `scripts/install.sh` optimisé avec téléchargement éphémère automatique des modules de `lib/` en cas d'exécution distante via pipe (`curl ... | bash`).
   - Support complet du mode non interactif (`OPENSIO_NONINTERACTIVE=1`) et du mode simulation (`--dry-run`).

2. **Nouveau script de préparation de nœud Ollama dédié (`scripts/setup-ollama-node.sh`)** :
   - Installation automatique d'Ollama sur machine Linux distante.
   - Configuration de l'override systemd `Environment="OLLAMA_HOST=0.0.0.0"`.
   - Téléchargement du modèle de langage demandé (`llama3.1:8b` par défaut).
   - Configuration du pare-feu UFW pour restreindre l'accès au port 11434 uniquement au sous-réseau LAN spécifié.
   - Avertissement de sécurité bien visible rappelant l'absence d'authentification native dans Ollama.

3. **Durcissement Docker Compose Prod (`docker-compose.prod.yml`)** :
   - Paramétrage des ports du service `caddy` via variables d'environnement (`${HTTP_PORT:-80}:80` et `${HTTPS_PORT:-443}:443`).
   - Ajout de `extra_hosts: ["host.docker.internal:host-gateway"]` sur le service `api` pour la communication avec Ollama hôte sous Linux.
   - Service `ollama` configuré avec profil optionnel `ai`, volume `ollama_models`, healthcheck `ollama list || exit 1` et redémarrage automatique `restart: unless-stopped`.
   - Caddyfile mis à jour pour supporter la directive TLS personnalisable (`{$TLS_DIRECTIVE:tls internal}`).

4. **Parité Windows (`scripts/install.ps1`)** :
   - Contrôle des prérequis avec le pattern établi (Docker, Git, Node, pnpm).
   - Choix de l'assistant IA adapté à Windows (Ollama local existant, nœud distant, sans IA).
   - Maintien du focus développement local (BDD Docker + applications Node.js).

5. **Prise en compte du mode Seed paramétrable (`apps/api/prisma/seed.ts`)** :
   - Support de la variable `SEED_MODE` (`full` vs `minimal`) permettant de n'initialiser que le compte administrateur en mode minimal.

6. **Restructuration de la documentation de déploiement (`docs/deployment.md`)** :
   - Matrice de décision comparative en tête de document (VM/LXC x 4 scénarios d'inférence).
   - Guide pas à pas par scénario avec dimensionnement matériel recommandé.
   - Documentation du mode non interactif (tableau des variables d'environnement) et de l'option `--dry-run`.
   - Section sécurité détaillée (isolation réseau d'Ollama, certificats TLS Caddy, gestion des secrets).

### Tests et Conformité
- Contrôle strict des variables IA : support conjoint de `OLLAMA_BASE_URL` et `AI_BASE_URL` dans `apps/api/src/config/env.validation.ts`, `apps/api/src/modules/ai/` et le générateur `.env`.
- Formatage ASCII pur : suppression de tous les émojis et caractères unicode dans les scripts (`[v]`, `[i]`, `[!]`, `[x]`, `[DRY-RUN]`, `-->`).
- `shellcheck` sans option `-x` (alignement CI `ludeeus/action-shellcheck`) : 100 % propre avec directives `# shellcheck source=... disable=SC1091`.
- `bash -n` sur tous les scripts Bash : 100 % valide.
- Règle D-13 / RM-13 : 100 % des fichiers <= 400 lignes.
- Validation des 8 scénarios d'exécution du wizard en mode `--dry-run`.

---

## 2026-08-25 — Lot C1 : Enrichissement du Contenu Pédagogique (BTS SIO SISR)

**Branche** : `feat/c1-contenu-pedagogique`  
**Objectif** : Enrichir le catalogue OpenSIO avec 12 nouvelles leçons détaillées, 12 quiz d'évaluation approfondis (72 questions avec explications pédagogiques) et 6 ateliers pratiques complets (niveaux 2_files avec validateurs autonomes et suites de fixtures).

### 1. Conventions d'Auteur & Outils de Validation (Étape 0)
- Rédaction du guide d'auteur `content/README.md` formalisant la structure, les métadonnées requises et les formats contractuels (Markdown, YAML, CSV).
- Création du script de validation autonome `content/validate.mjs` exécutant :
  - La validation Zod de tous les parcours, modules, leçons, quiz et labs via `@opensio/content-schema`.
  - La vérification de l'intégrité référentielle croisée (leçons liées, quiz, compétences B1/B2, labs requis).
  - L'exécution automatique de chaque suite de fixtures de lab (`solutions/valid/`, `solutions/invalid-*/`).

### 2. Module "Réseaux : Fondamentaux" (Étape 1)
Complétion intégrale du module avec 7 leçons, 7 quiz et 4 ateliers pratiques :
- **Leçons & Quiz associés (5+ questions par quiz)** :
  - `01-adressage-ipv4.md` + `quiz-adressage.yaml` (Existant)
  - `02-modeles-osi-tcpip.md` + `quiz-modeles-osi-tcpip.yaml` (Nouveau) : Couches OSI/TCP-IP, encapsulation, PDU, TCP vs UDP, ports d'écoute et commandes de diagnostic.
  - `03-subnetting-vlsm.md` + `quiz-subnetting-vlsm.yaml` (Nouveau) : Calculs avancés de masques à longueur variable, optimisation de découpage, exercices pas-à-pas.
  - `04-ipv6-essentiels.md` + `quiz-ipv6-essentiels.yaml` (Nouveau) : Structure 128 bits, règles de compression, types d'adresses (GUA, ULA, Link-Local), SLAAC, EUI-64 et protocole NDP.
  - `05-vlan-segmentation.md` + `quiz-vlan-segmentation.yaml` (Nouveau) : Isolation niveau 2, modes Access vs Trunk, tag 802.1Q, VLAN natif, durcissement et commandes Cisco IOS.
  - `06-routage-statique.md` + `quiz-routage-statique.yaml` (Nouveau) : Décision d'acheminement, Longest Prefix Match, routes par défaut/flottantes, Router-on-a-Stick, interfaces SVI et pannes de route retour.
  - `07-dns-et-dhcp.md` + `quiz-dns-et-dhcp.yaml` (Nouveau) : Hiérarchie DNS, types d'enregistrements (A, AAAA, CNAME, MX, PTR), processus DORA, options DHCP (3, 6, 15), agent de relais IP Helper et commandes de diagnostic.
- **Ateliers Pratiques (Labs de niveau 2_files avec validateurs)** :
  - `lab-plan-adressage` (slug : `plan-adressage-pme`) (Existant)
  - `lab-plan-vlsm` (slug : `plan-vlsm-complet`) (Nouveau) : Découpage VLSM d'une entreprise multi-sites sur `172.16.0.0/20` (500, 120, 60, 25, 2x2 postes) avec `plan.csv`.
  - `lab-config-vlan` (slug : `config-vlan-switch`) (Nouveau) : Configuration Cisco IOS d'un commutateur Catalyst avec VLANs 10, 20, 30, SVI 99 et port Trunk 802.1Q dans `switch.cfg`.
  - `lab-maquette-dns-dhcp` (slug : `maquette-dns-dhcp`) (Nouveau) : Déploiement combiné DNS/DHCP sur `192.168.50.0/24` avec domaine local, étendue dynamique, options et réservation d'imprimante dans `dnsmasq.conf`.

### 3. Module "Windows Server & Active Directory" (Étape 2)
Création complète du nouveau module `windows-server-ad` comprenant 6 leçons, 6 quiz et 3 ateliers pratiques :
- **Leçons & Quiz associés** :
  - `01-installation-et-roles.md` + `quiz-windows-installation-roles.yaml` : Éditions Standard vs Datacenter, Server Core vs Desktop Experience, rôles/fonctionnalités, RSAT, WinRM et automatisation PowerShell.
  - `02-ad-ds-et-domaine.md` + `quiz-ad-ds-et-domaine.yaml` : Forêt, domaines, contrôleurs de domaine, NTDS.dit, SYSVOL, Catalogue Global, les 5 rôles FSMO et dépendance critique DNS.
  - `03-utilisateurs-groupes-uo.md` + `quiz-utilisateurs-groupes-uo.yaml` : Arborescence d'UO, gestion du cycle de vie des identités, groupes (Sécurité vs Distribution, Global/Local/Universel), méthode AGDLP et délégation d'administration.
  - `04-strategies-de-groupe-gpo.md` + `quiz-strategies-de-groupe-gpo.yaml` : Architecture GPC/GPT, hiérarchie LSDOU, blocage d'héritage, GPO Enforced, filtrage de sécurité, GPP Item-Level Targeting et dépannage (gpupdate, gpresult).
  - `05-dns-dhcp-sous-windows.md` + `quiz-dns-dhcp-windows.yaml` : Zones DNS intégrées à AD, mises à jour dynamiques sécurisées, autorisation du serveur DHCP dans AD, basculement DHCP (Failover Load Balance / Hot Standby) et cmdlets PowerShell.
  - `06-partages-et-droits-ntfs.md` + `quiz-partages-et-droits-ntfs.yaml` : Partage SMB vs NTFS, règle du plus restrictif, héritage/droits explicites, implémentation AGDLP et commandes `icacls`.
- **Ateliers Pratiques** :
  - `lab-promotion-dc` (slug : `promotion-controleur-domaine`) : Script PowerShell `promote-dc.ps1` d'installation du rôle AD DS et de promotion du DC racine de la forêt `entreprise.lan`.
  - `lab-uo-gpo` (slug : `organisation-uo-et-gpo`) : Modélisation d'arborescence UO d'entreprise et liaisons GPO avec gestion de l'héritage dans `structure-uo.csv`.
  - `lab-partage-ntfs` (slug : `partage-et-droits-ntfs`) : Matrice de sécurité des partages SMB et permissions NTFS selon la méthode AGDLP dans `plan.csv`.

### 4. Bilan & Validations
- `node content/validate.mjs` : 100 % valide (13 leçons, 13 quiz, 77 questions, 7 labs, 21/21 tests de validateurs passants).
- `pnpm content:validate` : 100 % valide (18/18 tests de schéma Vitest passants).
- `pnpm content:sync` : Synchronisation Prisma réussie (+12 leçons, +6 labs, +12 quiz, +72 questions).
- `node scripts/check-file-size.mjs` : 100 % conforme D-13 (0 violation > 400 lignes).
- `pnpm test` : 100 % vert (173 tests passants sur l'ensemble du monorepo).
- Aucun emoji présent dans l'ensemble des fichiers de contenu et de code.

---

## [Lot C3] — Enrichissement du Mentor IA & Coaching Interactif

**Date** : 25/08/2026  
**Branches** : `feat/c3-gestion-conversations` (PR 1), `feat/c3-mentor-contextuel` (PR 2)  
**Objectif** : Gestion avancée des conversations du Mentor IA (CRUD, auto-titrage, renommage inline, archivage/désarchivage, isolation stricte), mentor contextuel avec injection fine titre/objectifs (sans surcharge de contexte LLM), et coaching interactif de quiz sur les erreurs.

### 1. Gestion des Conversations (Partie 1)
- **Base de Données & Migration Prisma** :
  - Colonnes `isCustomTitle` (Boolean, default false) et `archivedAt` (DateTime nullable) avec index composite `@@index([userId, archivedAt])` dans `apps/api/prisma/schema/chat.prisma`.
  - Migration SQL `20260825210000_c3_chat_conversations_archive`.
- **API NestJS pure sans dépendance LLM** :
  - `ChatConversationService` : CRUD complet avec contrôle d'appartenance strict (403 Forbidden / 404 Not Found).
  - `PATCH /api/v1/chat/conversations/:id` : Renommage manuel et archivage/désarchivage.
  - `DELETE /api/v1/chat/conversations/:id` : Suppression définitive avec cascade des messages.
  - `GET /api/v1/chat/conversations?status=active|archived|all` : Filtrage selon le statut.
  - Renommage automatique au 1er message via troncature déterministe propre sans appel LLM (`conversation-namer.util.ts`).
- **Interface Frontend Apprenant** :
  - Panneau latéral des discussions (`MentorConversationSidebar`, `MentorConversationItem`) avec liste active, section repliable des discussions archivées, renommage inline (Entrée/Échap) et suppression avec confirmation modale.
  - Accessibilité ARIA complète au clavier et lecteur d'écran.

### 2. Mentor Contextuel & Coaching Quiz (Partie 2)
- **Mentor Contextuel à Injection Fine** :
  - `AiContextSanitizerService` : Résolution serveur des entités (`Lesson`, `Module`, `Lab`, `Quiz`).
  - Injection dans le prompt système du **titre et des objectifs pédagogiques UNIQUEMENT** (jamais le cours complet), garantissant le respect de la fenêtre de contexte de `llama3.1:8b`.
  - Affichage discret dans le header du mentor du contexte actif (`Leçon : ...`, `Coaching Quiz`, `Lab : ...`).
  - Dégradation gracieuse et comportement général préservé en l'absence de contexte de page.
- **Coaching Interactif de Quiz** :
  - Sur l'écran de résultat de quiz (`QuizResultView`), bouton accessible « Expliquer avec le mentor » sur chaque réponse incorrecte (`!question.isCorrect`).
  - Émission de l'événement `opensio:open-mentor` initialisant une discussion pré-configurée avec la question, la réponse de l'étudiant et les consignes de coaching bienveillant (explication du piège conceptuel sans donner la réponse brute).
  - Maintien intégral des explications statiques existantes (Lot 5 / C1).
- **Refactoring & Conformité D-13** :
  - Découpage modulaire du frontend (`use-mentor-chat.ts`, `mentor-chat-header.tsx`, `mentor-conversation-sidebar.tsx`, `mentor-conversation-item.tsx`, `mentor-chat-drawer.tsx`).
  - Tous les fichiers sources $\le$ 400 lignes (0 violation D-13).

### 3. Validations & Qualité
- `pnpm lint` : 100 % vert (0 erreur, 0 avertissement).
- `pnpm typecheck` : 100 % vert dans tous les packages.
- `node scripts/check-file-size.mjs` : 100 % conforme D-13.
- `pnpm test` : 100 % vert (183 tests automatisés passants).

---

## 2026-08-26 — Correctif critique : Isolation complète de la base de données de test

**Branche** : `fix/tests-isolation-db`  
**Problème résolu** : Les tests d'intégration et E2E exécutaient des écritures (synchronisation, fixtures) directement contre la base `DATABASE_URL` de développement (`opensio`), purgeant le catalogue réel à chaque exécution de `pnpm test`.

### Réalisations
- **Base de données de test dédiée** :
  - Création de la base PostgreSQL `opensio_test`.
  - Script d'initialisation cross-platform `apps/api/src/prisma/ensure-test-db.ts` et montage `infra/docker/init-test-db.sql` dans `docker-compose.dev.yml`.
  - Création des fichiers `.env.test` (racine et `apps/api/.env.test`) avec `DATABASE_URL` pointant vers `opensio_test`.
- **Configuration Vitest & Dérivation Automatique** :
  - Fichier de setup global `apps/api/test/setup-env.ts` forçant `NODE_ENV=test`, chargeant `.env.test` et dérivant automatiquement toute `DATABASE_URL` pointant vers `opensio` vers `opensio_test`.
- **Garde-fous de sécurité stricts** :
  - `PrismaService` et `env.validation.ts` : Si `NODE_ENV === 'test'` et que `DATABASE_URL` cible la base de développement `opensio`, l'exécution est immédiatement bloquée avec une erreur explicite.
- **Workflow CI GitHub Actions & Cohérence Local / CI** :
  - Service Postgres aligné sur `POSTGRES_DB: opensio_test` et mot de passe unifié.
  - Déploiement des migrations via `prisma migrate deploy` directement contre `opensio_test` avant `pnpm test`.
  - Création de `.env.test.example` et `apps/api/.env.test.example` documentant la configuration attendue.
  - Harmonisation du skip gracieux en local dans `app-boot.e2e.spec.ts` et `chat.e2e.spec.ts` (0 test skippé en CI).
- **Vérification d'idempotence et d'intégrité** :
  - L'exécution de `pnpm test` suivie de `pnpm content:sync` affiche 100 % de « inchangés » sur la base de développement (0 suppression, 0 réinsertion).

---

## 2026-08-26 — [Lot C2 — Partie 1] : Interface et Expérience Utilisateur — Navigation & Progression

**Branche** : `feat/c2-navigation-progression`  
**Objectif** : Amélioration de l'expérience utilisateur et de la navigation globale d'OpenSIO (audit UX complet étape 0, navigation séquentielle de cours avec touches directes, sommaire latéral repliable du module, progression visuelle systématique sur le catalogue et mise en avant de la reprise de lecture sur le tableau de bord).

### 1. Audit UX Initial (Étape 0)
- Cartographie intégrale des pages (`/catalogue`, `/catalogue/[moduleSlug]`, `/catalogue/[moduleSlug]/[lessonSlug]`, `/catalogue/[moduleSlug]/quiz/[quizSlug]`, `/catalogue/[moduleSlug]/labs/[labSlug]`, `/dashboard`) et de leurs composants.
- Constat de non-régression : réutilisation intégrale des endpoints et services existants (`CatalogProgressEnricherService`, `ProgressAggregationService`, `DashboardService`) sans altération du cache ni requêtes N+1.

### 2. Navigation de Leçon & Sommaire de Module
- **Composant `LessonNavigation` (`apps/web/components/lessons/lesson-navigation.tsx`)** :
  - Boutons Précédent et Suivant avec affichage dynamique du titre de la leçon et de son statut d'achèvement.
  - En fin de module : détection automatique et proposition d'un lien d'évaluation vers le quiz du module (`quiz-*.yaml`) ou vers la page récapitulative du module.
  - Navigation au clavier accessible : écoute des touches directes `Flèche gauche` et `Flèche droite` avec garde stricte (désactivée dans les `<input>`, `<textarea>`, `<select>`, zones `contentEditable`, terminaux et éléments à rôle de saisie) et neutralisation si une touche modificatrice (`Alt`, `Ctrl`, `Meta`, `Shift`) est active.
  - Indicateur visuel `kbd` (`←` / `→`) pour guider l'apprenant.
- **Composant `LessonModuleSidebar` (`apps/web/components/lessons/lesson-module-sidebar.tsx`)** :
  - Sommaire latéral repliable du module affichant l'ensemble des leçons dans l'ordre pédagogique.
  - Indicateurs d'état : coche verte pour les leçons terminées, puce de focus pour la leçon active (`aria-current="page"`), durée estimée et barre de progression globale du module.
  - Accès direct aux quiz et labs du module.
  - Support responsive : volet rétractable sur desktop et tiroir (drawer) avec backdrop sur mobile, fermeture via la touche `Échap` et accessibilité ARIA complète (`aria-expanded`, `aria-controls`).

### 3. Progression Visuelle sur le Catalogue
- **Composant `ModuleCard` (`apps/web/components/catalog/module-card.tsx`)** :
  - Affichage systématique et harmonisé de la jauge de progression pour tous les modules (ex: `0/7 leçons (0 %)` si non entamé, jauge bleue en cours, jauge verte émeraude avec badge « Validé » à 100 %).
  - Accessibilité : attributs `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"` et `aria-label`.

### 4. Tableau de Bord — Reprendre où tu t'es arrêté
- **Composant `DashboardResume` (`apps/web/components/dashboard/dashboard-resume.tsx`)** :
  - Identification et mise en valeur prioritaire de la dernière leçon consultée non terminée (`status === 'started'`) dans une carte dédiée avec bouton direct « Reprendre la leçon ».
  - Grille secondaire pour les autres activités récentes et état vide accueillant pour les nouveaux apprenants.

### 5. Validations & Tests
- `apps/web/test/lesson-navigation.spec.tsx` : 5 tests unitaires validant l'affichage, la transition vers le quiz, la navigation clavier et les gardes sur les champs de saisie.
- `apps/web/test/lesson-module-sidebar.spec.tsx` : 3 tests validant le rendu des leçons, l'indicateur `aria-current="page"`, la bascule et la fermeture par la touche `Échap`.
- `apps/web/test/module-card.spec.tsx` : tests mis à jour avec le rôle `progressbar` et l'état par défaut à 0 %.
- `apps/web/test/dashboard-page.spec.tsx` : tests mis à jour avec la nouvelle structure de reprise d'activité.
- `pnpm test` : 100 % vert (**267 tests automatisés** : 185 API, 64 Web, 18 Content-Schema).
- `pnpm lint` : 100 % vert (0 erreur, 0 avertissement).
- `pnpm typecheck` : 100 % vert.
- `node scripts/check-file-size.mjs` : 100 % conforme D-13 (270 fichiers analysés, 0 violation > 400 lignes).
- `pnpm build` : Build de production Next.js 15 App Router et NestJS 11 validé avec succès.

---

## 2026-08-26 — [Lot C2 — Partie 2] : Interface et Expérience Utilisateur — UX Quiz & Labs

**Branche** : `feat/c2-ux-quiz-labs`  
**Objectif** : Perfectionnement de l'expérience interactive des quiz et des ateliers pratiques (labs) avec progression pas-à-pas, révision complète des réponses avant soumission finale, checklist interactive des étapes de lab avec suivi local, cartouche enrichi temps/points et intégration complète des blocs de commandes copiables.

### 1. Ergonomie et Déroulement des Quiz
- **Mode Pas-à-Pas & Stepper Interactif (`QuizStepper`)** :
  - Découpage séquentiel des questions avec affichage clair du rang (`Question X sur Y`).
  - Navigation par pastilles d'états : en cours (bordure active), répondue (fond émeraude et coche), non répondue (fond ardoise sombre).
  - Boutons de déplacement rapide « Précédente » et « Suivante » avec mise à jour immédiate du scroll et des états de validation.
- **Écran de Revue & Récapitulatif Pré-Soumission (`QuizReviewStep`)** :
  - Vue d'ensemble de l'ensemble des réponses sélectionnées par l'étudiant avec affichage détaillé des intitulés de choix.
  - Alerte visuelle en cas de questions non renseignées (`X questions sans réponse`).
  - Bouton direct « Modifier » ramenant précisément sur la question ciblée.
  - Soumission finale sécurisée avec états de chargement (`isSubmitting`) et désactivation préventive des boutons.
- **Transition douce vers les résultats** :
  - Animations discrètes `animate-in fade-in` et harmonisation du scroll vers le résultat.

### 2. Ergonomie et Déroulement des Labs
- **Checklist Interactive des Étapes (`LabStepChecklist`)** :
  - Agrégation structurée des objectifs pédagogiques et des critères d'évaluation du validateur.
  - Cochage interactif avec persistance locale dans le navigateur (`localStorage`) indexée par lab et session.
  - Jauge de progression dédiée (`X / Y étapes franchies - Z%`) et action de réinitialisation.
- **Blocs de Code et Commandes Copiables** :
  - Contexte et scénario de lab rendus via `MarkdownRenderer` : coloration syntaxique Shiki et bouton « Copier » universel avec retour visuel immédiat.
- **Cartouche Enrichi Temps / Points (`LabHeader`)** :
  - Présentation modernisée en grille : durée estimée, score maximum, seuil plancher après indices, nombre d'indices et badge de statut de session dynamique.

### 3. Validations & Tests
- `apps/web/test/quiz-runner.spec.tsx` : 6 tests unitaires et d'intégration validant le mode pas-à-pas, la navigation, le stepper, la revue et la soumission.
- `apps/web/test/quiz-stepper.spec.tsx` : 3 tests unitaires du composant stepper.
- `apps/web/test/quiz-review-step.spec.tsx` : 4 tests unitaires de l'écran récapitulatif.
- `apps/web/test/lab-step-checklist.spec.tsx` : 3 tests unitaires de la checklist et du stockage local.
- `apps/web/test/lab-header.spec.tsx` : 2 tests du cartouche temps/points et des badges de session.
- `apps/web/test/lab-context.spec.tsx` : 1 test du rendu Markdown et des contrôles de validation.
- `pnpm test` : 100 % vert (**282 tests automatisés** : 185 API, 79 Web, 18 Content-Schema).
- `pnpm lint` : 100 % vert (0 erreur, 0 avertissement).
- `pnpm typecheck` : 100 % vert.
---

## 2026-08-26 — [Lot D1] : Comptes réels, rôles et administration

**Branche** : `feat/d1-roles-admin`  
**Objectif** : Mise en place du modèle de rôles formel (`ADMIN`, `APPRENANT`), administration des comptes utilisateurs, amorçage sécurisé configurable (seed admin & démo conditionnelle), procédure de premier login avec mot de passe temporaire forcé et interface d'administration complète.

### 1. Modèle de Données & Migration Prisma
- **Enum `Role`** : remplacement de l'ancien `UserRole` par `enum Role { ADMIN @map("admin"), APPRENANT @map("apprenant") }`.
- **Flag `mustChangePassword`** : ajout du champ booléen `mustChangePassword Boolean @default(false) @map("must_change_password")` sur le modèle `User`.
- **Migration SQL robuste** : création de `20260826160000_lot_d1_roles_admin` assurant la migration sécurisée des comptes existants (`student`/`teacher` convertis en `apprenant`).
- **Seed & Configuration d'Amorçage** :
  - Compte administrateur configurable via `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD` (documenté dans `.env.example`).
  - Compte étudiant démo conditionné à `DEMO_SEED=true` (absent par défaut).

### 2. Backend & API NestJS
- **Décorateur `@Roles` & `RolesGuard`** : protection RBAC native au niveau des routes et contrôleurs API.
- **Module Administration (`AdminModule`)** :
  - `GET /api/v1/admin/users` : liste paginée avec filtres (recherche texte, rôle, statut).
  - `POST /api/v1/admin/users` : création de compte par un admin avec génération de mot de passe temporaire et `mustChangePassword=true`.
  - `PATCH /api/v1/admin/users/:id` : mise à jour des informations, rôle et statut (avec garde-fous stricts interdisant l'auto-rétrogradation et l'auto-désactivation d'un admin).
  - `POST /api/v1/admin/users/:id/reset-password` : réinitialisation de mot de passe par l'admin, révocation instantanée des sessions actives et activation de `mustChangePassword`.
  - Révocation automatique de toutes les sessions actives (`RefreshTokenService.revokeAllUserTokens`) lors de la désactivation ou de la réinitialisation de compte.
  - Traçabilité totale via `AuditService` (`ADMIN_USER_CREATE`, `ADMIN_USER_UPDATE`, `ADMIN_USER_PASSWORD_RESET`).
- **Changement de Mot de Passe (`POST /api/v1/auth/change-password`)** :
  - Endpoint authentifié permettant à l'utilisateur de valider son ancien mot de passe, de définir son nouveau mot de passe fort et de désactiver `mustChangePassword`.

### 3. Frontend Web Next.js 15 & Interface d'Administration
- **Navigation conditionnelle (`Navbar`)** : affichage du lien « Administration » réservé exclusivement aux utilisateurs possédant le rôle `ADMIN`.
- **Garde de route (`AdminRoute`)** : protection des pages `/admin/*` avec redirection des non-connectés et message d'accès restreint pour les apprenants.
- **Page de Gestion des Utilisateurs (`/admin/users`)** :
  - Cartouche de statistiques dynamiques (Total, Administrateurs, Apprenants, Comptes actifs).
  - Barre de filtres (recherche nom/email, filtre par rôle, filtre par statut, réinitialisation).
  - Tableau moderne et réactif avec badges de rôle, indicateurs d'état, badges de sécurité (mot de passe temporaire / défini), dates de création et dernier accès.
  - Dialogue de création (`CreateUserDialog`) avec génération/saisie de mot de passe temporaire et bouton de copie en un clic.
  - Dialogue de modification (`EditUserDialog`) avec protection contre l'auto-rétrogradation.
  - Dialogue de réinitialisation (`ResetPasswordDialog`) avec génération de mot de passe temporaire et bouton de copie.
  - Dialogue d'activation/désactivation (`ToggleStatusDialog`) avec confirmation explicite et protection contre l'auto-verrouillage.
- **Modale de changement forcé (`ForcePasswordChangeModal`)** :
  - Modale bloquante globale déclenchée automatiquement dès la connexion si `mustChangePassword=true`.
  - Checklist interactive des critères de sécurité du mot de passe en temps réel.

### 4. Validations & Qualité
- **Tests API** :
  - `apps/api/src/modules/admin/__tests__/admin-users.service.spec.ts` : 9 tests unitaires (CRUD, filtres, auto-protection, révocation, politique de mot de passe).
  - `apps/api/src/modules/admin/__tests__/admin-users.e2e.spec.ts` : 6 tests d'intégration PostgreSQL et contrôles RBAC.
  - `apps/api/src/modules/auth/auth.e2e.spec.ts` : tests d'intégration mis à jour avec le flux complet de changement de mot de passe.
  - Tous les tests de modules existants (`auth`, `labs`, `quizzes`, `progress`, `terminal`, `ai`, `demo-*`) mis à jour pour le nouvel enum `Role`.
- **Tests Frontend** :
  - `apps/web/test/admin-route.spec.tsx` : 4 tests de protection RBAC frontend.
  - `apps/web/test/force-password-change-modal.spec.tsx` : 4 tests du modal de changement forcé de mot de passe.
  - `apps/web/test/navbar-admin.spec.tsx` : 2 tests de conditionnement de la navigation.
  - `apps/web/test/admin-users-page.spec.tsx` : 2 tests d'intégration de la page d'administration.
- **Bilan des Métriques** :
  - `pnpm test` : 100 % vert (**303 tests automatisés** : 194 API, 91 Web, 18 Content-Schema).
  - `pnpm lint` : 100 % vert (0 erreur, 0 avertissement).
  - `pnpm typecheck` : 100 % vert (0 erreur TypeScript).
  - `node scripts/check-file-size.mjs` : 100 % conforme D-13 (305 fichiers analysés, 0 violation > 400 lignes).
  - `pnpm build` : Build de production Next.js 15 App Router et NestJS 11 validé avec succès.

---

## 2026-08-26 — [Lot D2] : Profil utilisateur complet, Avatar, Préférences & RGPD

**Branche** : `feat/d2-profil`  
**Objectif** : Implémentation complète de la gestion du profil utilisateur : correctif préalable du seed admin D-09, upload/suppression d'avatar sécurisé avec stockage disque local et validation stricte de types MIME / magic bytes, édition des informations personnelles et de la biographie, gestion des préférences d'interface et d'IA, changement de mot de passe avec checklist D-09, et flux d'effacement RGPD avec suppression physique de l'avatar et purge en cascade.

### 1. Correctif Préalable — Validation D-09 du Seed Admin
- **Validation stricte au seed** : `prisma/seed.ts` valide désormais `SEED_ADMIN_PASSWORD` (et `SEED_STUDENT_PASSWORD`) contre la politique de sécurité D-09 (12+ caractères, au moins 3 classes).
- **Échec bruyant et explicite** : si le mot de passe est insuffisant, le script lève une erreur explicite avec code de sortie non nul.
- **Cohérence des hashs** : inclusion de `passwordHash` dans le bloc `update` de l'upsert afin de garantir que les comptes existants reçoivent le hash exact de la variable d'environnement courante.
- **Test automatisé** : `apps/api/src/modules/auth/__tests__/seed-validation.spec.ts` (4 tests unitaires).

### 2. Modèle de Données & Migration Prisma
- **Champs ajoutés au modèle `User`** :
  - `avatarUrl String? @map("avatar_url")`
  - `bio String? @db.Text`
  - `preferences Json?`
- **Migration SQL** : `20260826180000_lot_d2_user_profile` appliquée avec succès.

### 3. Backend & API Profil (`ProfileModule`)
- **Stockage Sécurisé de l'Avatar (`AvatarStorageService`)** :
  - Stockage local dans `uploads/avatars/` (compatible volume Docker).
  - Validation binaire stricte des magic bytes (JPEG, PNG, WebP, GIF) et limite de taille à 2 Mo max.
  - Génération de noms de fichiers sécurisés (`avatar_<userId>_<timestamp>_<uuid>.<ext>`) et protection regex anti-traversée de chemin.
  - Streaming sécurisé avec en-têtes `X-Content-Type-Options: nosniff` et cache optimisé.
  - Suppression automatique de l'ancien fichier d'avatar lors d'un remplacement.
- **Endpoints REST API (`/api/v1/profile` & `/api/v1/users/avatar`)** :
  - `GET /api/v1/profile` : Profil complet de l'utilisateur connecté avec bio, préférences et IA.
  - `PATCH /api/v1/profile` : Mise à jour du nom d'affichage et de la bio (validation Zod).
  - `POST /api/v1/profile/avatar` : Upload d'avatar (`multipart/form-data`, validation fichier et audit log).
  - `DELETE /api/v1/profile/avatar` : Suppression de la photo de profil et purge du fichier disque.
  - `GET /api/v1/profile/preferences` : Consultation des préférences d'interface et IA.
  - `PATCH /api/v1/profile/preferences` : Mise à jour atomique des préférences.
  - `DELETE /api/v1/profile` : Suppression de compte RGPD (détruit le fichier avatar, révoque tous les refresh tokens de session, consigne l'audit log `USER_ACCOUNT_DELETE_RGPD` et supprime le compte en base).
  - `@Public() GET /api/v1/users/avatar/:filename` : Endpoint public de diffusion sécurisée de l'avatar.
- **Mise à jour d'AuthService & JwtService** :
  - Les profils renvoyés lors du login, refresh et `getMe` intègrent `avatarUrl`, `bio` et `preferences`.

### 4. Frontend Web Next.js 15 & Expérience Profil (`apps/web`)
- **Affichage Avatar & Initiales dans la `Navbar`** :
  - Affiche l'image de l'avatar si disponible, ou le fallback élégant des initiales (`getInitials`) avec lien direct vers `/profile`.
- **Page Profil Complète (`/profile`)** :
  - `ProfileHeader` : Cartouche visuel avec grand avatar, nom d'affichage, badge de rôle, adresse email, date d'inscription et date du dernier accès.
  - `AvatarUploader` : Sélecteur de fichier avec prévisualisation en direct, validation 2 Mo / format d'image, bouton d'enregistrement et bouton de suppression.
  - `ProfileEditor` : Modification du nom et de la bio avec compteur de caractères en temps réel (max 500).
  - `ProfilePreferences` : Personnalisation du thème (sombre/clair/système), effets sonores et préférences de l'assistant Mentor IA.
  - `ProfileSecurity` : Formulaire de changement de mot de passe avec checklist interactive D-09 en temps réel.
  - `ProfileRgpd` : Cartouche d'information RGPD et zone critique de suppression définitive du compte avec modale sécurisée et saisie obligatoire de confirmation.

### 5. Validations & Tests
- **Tests API** :
  - `apps/api/src/modules/auth/__tests__/seed-validation.spec.ts` : 4 tests unitaires de validation du seed.
  - `apps/api/src/modules/profile/__tests__/avatar-storage.service.spec.ts` : 10 tests unitaires du stockage d'avatar.
  - `apps/api/src/modules/profile/__tests__/profile.service.spec.ts` : 7 tests unitaires de la logique métier et RGPD.
  - `apps/api/src/modules/profile/__tests__/profile.e2e.spec.ts` : 6 tests d'intégration PostgreSQL complets.
- **Tests Frontend** :
  - `apps/web/test/navbar-avatar.spec.tsx` : 2 tests d'affichage d'avatar et initiales dans la navbar.
  - `apps/web/test/avatar-uploader.spec.tsx` : 5 tests du composant uploader (validation, preview, upload, suppression).
  - `apps/web/test/profile-editor.spec.tsx` : 2 tests d'édition et soumission du profil.
  - `apps/web/test/profile-preferences.spec.tsx` : 1 test de gestion des préférences.
  - `apps/web/test/profile-rgpd.spec.tsx` : 2 tests de confirmation et suppression RGPD.
  - `apps/web/test/profile-page.spec.tsx` : 2 tests d'intégration de la page `/profile`.
- **Bilan Global des Métriques** :
  - `pnpm test` : 100 % vert (**351 tests automatisés** : 228 API, 105 Web, 18 Content-Schema — 0 skipped).
  - `pnpm lint` : 100 % vert (0 erreur, 0 avertissement).
  - `pnpm typecheck` : 100 % vert (0 erreur TypeScript).
---

## 2026-08-26 — [Fix Lot D2] : Câblage complet & Correction du Thème Clair / Sombre / Système

**Branche** : `fix/d2-theme-clair`  
**Objectif** : Rendre le thème clair pleinement fonctionnel avec bascule instantanée sans flash de chargement (FOUC), palette de couleurs claire complète et contrastée sur tous les composants (cartes, tableaux, formulaires, code Shiki dual-theme, terminal simulé, tiroir Mentor IA), support des 3 options de préférences (sombre par défaut, clair, système suivant l'OS), synchronisation du profil utilisateur et repli `localStorage`.

### 1. Mécanisme de Thème & Zéro Flash au Chargement
- **Intégration de `next-themes`** :
  - Client wrapper `ThemeProvider` (`apps/web/components/theme/theme-provider.tsx`) configuré avec `attribute="class"`, `defaultTheme="dark"`, `enableSystem={true}` et stockage automatique de clé `theme` dans `localStorage`.
  - Intégration dans le layout racine `apps/web/app/layout.tsx` avec `suppressHydrationWarning` sur la balise `<html>`.
  - Script bloquant inline côté serveur injecté par `next-themes` éliminant tout flash de thème blanc/noir au premier chargement.
- **Configuration Tailwind CSS** :
  - Ajout de `darkMode: 'class'` dans `packages/config/tailwind/tailwind.config.ts` et `apps/web/tailwind.config.ts`.

### 2. Design Tokens & Palette Graphique Bi-Thème
- **Tokens CSS (`apps/web/styles/tokens.css`)** :
  - `:root` : palette claire native contrastée (`--bg-primary: #f8fafc`, `--bg-secondary: #ffffff`, `--bg-card: rgba(255, 255, 255, 0.92)`, `--text-primary: #0f172a`, `--border-default: #e2e8f0`, etc.).
  - `.dark` : palette sombre d'origine conservée et sublimée (`--bg-primary: #020617`, `--bg-secondary: #0b1120`, `--text-primary: #f8fafc`, etc.).
- **Composants & Feuilles de Style Spécialisées** :
  - `base.css` : adaptation des classes `.glass-panel` et `.glass-panel-hover` pour les fonds clairs et sombres.
  - `lessons.css` : adaptation complète de la typographie `.lesson-prose` (titres, paragraphes, citations, listes, tableaux, code inline).
  - `CodeBlock` (`apps/web/components/lessons/code-block.tsx`) : coloration syntaxique Shiki bi-thème simultanée (`github-light-default` / `github-dark-default`), bascule instantanée sans ré-exécution de `codeToHtml` grâce aux variables CSS `--shiki-light` / `--shiki-dark`.
  - `LabTerminal` (`apps/web/components/labs/lab-terminal.tsx`) : contrôles, barre d'état et raccourcis adaptés en mode clair tout en préservant un contraste élevé sur la console terminal.
  - Navbar, fil d'Ariane, formulaires d'authentification, pages Catalogue, Dashboard, Administration, Profil et tiroir Mentor IA intégralement adaptés avec contrastes certifiés.

### 3. Câblage des Préférences & Tests
- **Sélecteur de Thème (`ProfilePreferences`)** :
  - Boutons interactifs avec icônes `Moon`, `Sun`, `Sliders` pour « Sombre », « Clair », « Système ».
  - Bascule visuelle immédiate via `useTheme().setTheme` combinée à la sauvegarde de profil via l'API REST `PATCH /api/v1/profile/preferences`.
- **Tests Automatisés Frontend** :
  - `apps/web/test/theme-integration.spec.tsx` : tests d'intégration Vitest validant le `ThemeProvider`, la valeur par défaut (`dark`), la bascule vers `light` et `system`, et l'interaction avec `ProfilePreferences`.
- **Bilan des Métriques** :
  - `pnpm test` : 100 % vert (**354 tests automatisés** : 228 API, 108 Web, 18 Content-Schema — 0 skipped, 0 failed).
  - `pnpm lint` : 100 % vert (0 erreur, 0 avertissement).
  - `pnpm typecheck` : 100 % vert (0 erreur TypeScript).
  - `node scripts/check-file-size.mjs` : 100 % conforme D-13 (331 fichiers analysés, 0 violation > 400 lignes).

---

## 2026-08-26 — [Correctif Exhaustif] : Audit & Conversion Bi-Thème Complète avec Garde-Fou CI

**Branche** : `fix/theme-clair-complet`  
**Objectif** : Éliminer 100 % des classes sombres hardcodées résiduelles dans `apps/web` (boutons/cartes d'accès aux leçons/quiz/labs, en-tête de module, listes de cours, progression de track, widgets dashboard, modales, dialogues admin, formulaires, tiroir Mentor IA et skeletons de chargement), mettre en place un script de contrôle automatisé `scripts/check-theme-classes.mjs` intégré à la CI GitHub Actions, et certifier l'accessibilité bi-thème page par page.

### 1. Audit Exhaustif & Remplacement des Classes Hardcodées
- **Composants Catalogue (`apps/web/components/catalog/`)** :
  - `module-header.tsx`, `module-lessons-list.tsx`, `module-quizzes-list.tsx`, `module-labs-list.tsx`, `track-section.tsx`, `module-card.tsx` : conversion des fonds fixes, bordures sombres et textes atténués en variantes bi-thème (`dark:`).
- **Composants Dashboard (`apps/web/components/dashboard/`)** :
  - `dashboard-header.tsx`, `dashboard-stats.tsx`, `dashboard-recommendations.tsx`, `dashboard-resume.tsx`, `dashboard-tracks.tsx`, `dashboard-quizzes.tsx`, `dashboard-activity.tsx` : cartes, jauges et compteurs adaptés aux contrastes clairs et sombres.
- **Composants Leçons, Labs & Quiz** :
  - `lesson-header.tsx`, `lesson-metadata.tsx`, `lesson-module-sidebar.tsx`, `lesson-navigation.tsx`, `lesson-complete-button.tsx`, `markdown-renderer.tsx`.
  - `lab-header.tsx`, `lab-context.tsx`, `lab-editor.tsx`, `lab-hints.tsx`, `lab-session-controls.tsx`, `lab-step-checklist.tsx`, `lab-terminal.tsx`, `lab-verdict.tsx`.
  - `quiz-runner.tsx`, `quiz-stepper.tsx`, `quiz-question-item.tsx`, `quiz-review-step.tsx`, `quiz-result-view.tsx`.
- **Composants Admin, Auth & Profil** :
  - `admin-users-header.tsx`, `admin-users-filters.tsx`, `admin-users-table.tsx`, `admin-pagination.tsx`, `create-user-dialog.tsx`, `edit-user-dialog.tsx`, `reset-password-dialog.tsx`, `toggle-status-dialog.tsx`.
  - `login-form.tsx`, `force-password-change-modal.tsx`, `admin-route.tsx`, `protected-route.tsx`.
  - `profile-editor.tsx`, `profile-header.tsx`, `profile-preferences.tsx`, `profile-rgpd.tsx`, `profile-security.tsx`, `avatar-uploader.tsx`.
  - `mentor-chat-drawer.tsx`, `mentor-chat-header.tsx`, `mentor-chat-input.tsx`, `mentor-chat-messages.tsx`, `mentor-chat-settings.tsx`, `mentor-conversation-item.tsx`, `mentor-conversation-sidebar.tsx`.
- **Pages & Skeletons de chargement (`apps/web/app/**`)** :
  - Remplacement de toutes les classes `bg-slate-800` et `text-slate-400` des squelettes (`loading.tsx`) par des classes dynamiques `bg-slate-200 dark:bg-slate-800`.

### 2. Garde-Fou CI Durable (`scripts/check-theme-classes.mjs`)
- Création d'un script d'analyse statique dédié `scripts/check-theme-classes.mjs` vérifiant l'absence de classes sombres hardcodées sans variante `dark:` dans `apps/web/app` et `apps/web/components`.
- Ajout du script `"check:theme": "node scripts/check-theme-classes.mjs"` dans le `package.json` racine.
- Intégration dans le pipeline CI `.github/workflows/ci.yml` pour bloquer toute régression future.

### 3. Validations & Métriques
- `node scripts/check-theme-classes.mjs` : **0 violation** sur 83 fichiers analysés.
- `node scripts/check-file-size.mjs` : 100 % conforme D-13 (0 violation > 400 lignes sur 331 fichiers analysés).
- `pnpm lint --force` : 100 % vert (0 erreur, 0 avertissement sur les 4 packages).
- `pnpm typecheck --force` : 100 % vert (0 erreur TypeScript).
- `pnpm test --force` : 100 % vert (**354 tests passants** : 228 API, 108 Web, 18 Content-Schema — 0 failed, 0 skipped).
- `pnpm build --force` : 100 % vert (Next.js 15 App Router et NestJS 11).

---

## 2026-08-27 — [Lot D3] : Contenu SISR — Cartographie & Phase 2.1 (Socle Linux & Services Réseau)

**Branches** : `docs/d3-carte-modules` (Phase 1), `feat/d3-socle-systemes-linux` (Phase 2.1)  
**Objectif** : Cartographie exhaustive des 19 modules du référentiel national BTS SIO option SISR, ordonnancement pédagogique en 5 phases, réintégration justifiée du module transversal d'anglais technique, et production complète des 2 modules prioritaires de 1ère année (`linux-administration` et `services-reseau-linux`).

### 1. Phase 1 — Cartographie Référentiel & Investigation
- **Investigation Git sur `anglais-technique`** :
  - Identification de l'omission technique lors du passage à la structure hiérarchique par tracks en v0.2.0.
  - Justification contractuelle et réintégration au catalogue en 1ère année (Module transversal, épreuve nationale E2).
- **Cartographie Référentiel (`docs/modules-map.md`)** :
  - Définition complète des 19 modules (8 en 1ère année, 11 en 2ème année), alignés sur les blocs B1.1–B1.6, B2.1–B2.3, B3.1–B3.4 et E2.
  - Spécification détaillée des slugs, intitulés, durées, niveaux, idées de labs et matrice de couverture croisée.
  - Mise à jour de la feuille de route pédagogique dans `docs/roadmap.md` (§4).

### 2. Phase 2.1 — Production du Module `linux-administration`
- **Module `linux-administration`** (6 leçons, 6 quiz, 3 labs) :
  - `01-arborescence-fhs-et-permissions.md` + `quiz-arborescence-fhs-et-permissions.yaml` : Norme FHS, UGO octal/symbolique, bits spéciaux SUID, SGID, Sticky Bit et ACL POSIX.
  - `02-gestion-utilisateurs-et-sudo.md` + `quiz-gestion-utilisateurs-et-sudo.yaml` : Fichiers `/etc/passwd`, `/etc/shadow`, `/etc/group`, commande `chage` et délégation `visudo`/`sudoers`.
  - `03-paquets-et-logiciels-apt.md` + `quiz-paquets-et-logiciels-apt.yaml` : Dépôts APT, clés GPG, gestion des paquets `dpkg`/`apt`, et correctifs `unattended-upgrades`.
  - `04-gestion-services-systemd.md` + `quiz-gestion-services-systemd.yaml` : Unités `.service`, `.target`, cycle de vie `systemctl`, rédaction d'unité et dépannage.
  - `05-stockage-disques-et-lvm.md` + `quiz-stockage-disques-et-lvm.yaml` : GPT, ext4/xfs, points de montage `/etc/fstab` durcis avec UUIDs, architecture LVM (PV, VG, LV) et extension à chaud.
  - `06-analyse-journaux-et-processus.md` + `quiz-analyse-journaux-et-processus.yaml` : Surveillance des processus (`ps`, `htop`, `free`, `df`), signaux POSIX, `journalctl` et rotation `logrotate`.
  - **3 Labs autonomes de niveau 2_files avec suites de tests complètes** :
    - `lab-droits-fhs` (`droits-fhs-et-permissions`) : Matrice de sécurisation FHS (SGID 2770, Sticky 1777, TLS 710) dans `permissions.csv`.
    - `lab-configuration-lvm` (`configuration-stockage-lvm`) : Montages fstab durcis avec UUIDs et options `nodev,nosuid,noexec` dans `fstab`.
    - `lab-depannage-systemd` (`depannage-service-systemd`) : Unité de service systemd durcie (non-root, After/Requires, Restart, NoNewPrivileges) dans `api-backend.service`.

### 3. Phase 2.1 — Production du Module `services-reseau-linux`
- **Module `services-reseau-linux`** (5 leçons, 5 quiz, 2 labs) :
  - `01-serveur-dhcp-linux.md` + `quiz-serveur-dhcp-linux.yaml` : Processus DORA, configuration ISC-DHCP (`dhcpd.conf`), architecture ISC Kea (JSON) et baux.
  - `02-serveur-dns-bind9-autorite.md` + `quiz-serveur-dns-bind9-autorite.yaml` : Architecture Bind9, zones directes/inverses, enregistrements SOA, NS, MX, A, CNAME, PTR et point terminal.
  - `03-resolution-dns-recursive-cache.md` + `quiz-resolution-dns-recursive-cache.yaml` : Résolution récursive vs itérative, forwarders, randomisation des ports, DNSSEC, durcissement ANSSI et administration `rndc`.
  - `04-synchronisation-horaire-ntp.md` + `quiz-synchronisation-horaire-ntp.yaml` : Strates NTP (0 à 15), importance pour Kerberos/TLS, configuration Chrony (`chrony.conf`), outil `chronyc` et client `systemd-timesyncd`.
  - `05-relais-dhcp-et-multi-sous-reseaux.md` + `quiz-relais-dhcp-et-multi-sous-reseaux.yaml` : Traversée des routeurs, champ `giaddr`, Option 82, `isc-dhcp-relay` et `ip helper-address`.
  - **2 Labs autonomes de niveau 2_files avec suites de tests complètes** :
    - `lab-dns-bind9` (`configuration-dns-bind9`) : Déploiement complet Bind9 (zone directe `db.societe.lan` et zone inverse `db.192.168.10` avec réciprocité PTR).
    - `lab-serveur-dhcp-kea` (`configuration-dhcp-kea`) : Déploiement ISC Kea JSON (`kea-dhcp4.conf`) avec pools, options DHCP et réservation MAC.

### 4. Validations & Métriques de Contenu
- `node content/validate.mjs` : **100 % valide** :
  - 4 modules opérationnels (`reseaux-fondamentaux`, `windows-server-ad`, `linux-administration`, `services-reseau-linux`).
  - 24 leçons complètes et relues.
  - 24 quiz d'évaluation (132 questions avec explications pédagogiques).
  - 12 ateliers pratiques de niveau 2_files avec validateurs autonomes.
  - **36 / 36 tests de validateurs passants** sur les suites de fixtures (`valid` et `invalid-*`).
- `pnpm content:validate` : 100 % valide (18/18 tests Zod passants).
- `node scripts/check-file-size.mjs` : 100 % conforme D-13 (331 fichiers analysés, 0 violation > 400 lignes).
- `node scripts/check-theme-classes.mjs` : 100 % conforme bi-thème (0 violation).

### 5. Phase 2.2 — Production du Module `virtualisation-systemes`
- **Module `virtualisation-systemes`** (5 leçons, 5 quiz, 2 labs) :
  - `01-hyperviseurs-type1-type2.md` + `quiz-hyperviseurs-type1-type2.yaml` : Hyperviseurs Type 1 (Bare-Metal) vs Type 2 (Hosted), KVM/QEMU, virtualisation imbriquée, extensions CPU (VT-x, AMD-V, EPT, NPT).
  - `02-architecture-proxmox-ve.md` + `quiz-architecture-proxmox-ve.yaml` : Architecture Proxmox VE (Debian 12 + KVM + LXC + pve-cluster), corosync, stockage (local-lvm, ZFS, Ceph, NFS) et commandes CLI `qm` / `pct` / `pvesm`.
  - `03-reseau-virtuel-bridges-vlans.md` + `quiz-reseau-virtuel-bridges-vlans.yaml` : Linux Bridges (`vmbr0`, `vmbr1`), configuration `/etc/network/interfaces`, mode `bridge-vlan-aware`, isolation DMZ et agrégation de liens (Bonds LACP 802.3ad).
  - `04-modeles-clones-lies-cloudinit.md` + `quiz-modeles-clones-lies-cloudinit.yaml` : Modèles de VMs, Clones intégraux vs Clones liés (_Linked Clones_), et provisionnement automatisé Cloud-Init (`user-data`, `users`, `packages`, `runcmd`).
  - `05-dimensionnement-ressources-quotas.md` + `quiz-dimensionnement-ressources-quotas.yaml` : Sur-allocation (Overcommitment vCPU/vRAM), ballon mémoire VirtIO Ballooning, limitation I/O (IOPS, débit Mo/s) et pools de ressources.
  - **2 Labs autonomes de niveau 2_files avec suites de tests complètes** :
    - `lab-config-cloudinit` (`configuration-cloudinit-vm`) : Configuration déclarative Cloud-Init dans `user-data` avec en-tête `#cloud-config`, compte `admin-sys`, clé SSH et durcissement pare-feu UFW dans `runcmd:`.
    - `lab-interfaces-proxmox` (`configuration-interfaces-proxmox`) : Configuration réseau `/etc/network/interfaces` Proxmox avec pont public `vmbr0` (VLAN-aware, passerelle) et pont privé isolé `vmbr1` (DMZ interne).

### 6. Validations Globales Post-Virtualisation
- `node content/validate.mjs` : **100 % valide** :
  - 5 modules opérationnels (`reseaux-fondamentaux`, `windows-server-ad`, `linux-administration`, `services-reseau-linux`, `virtualisation-systemes`).
  - 29 leçons rédigées et validées.
  - 29 quiz d'évaluation (157 questions).
  - 14 ateliers pratiques (Labs).
  - **43 / 43 tests de validateurs passants** sur les suites de fixtures.
- `pnpm content:validate` : 100 % valide (18/18 tests Zod passants).
- `node scripts/check-file-size.mjs` : 100 % conforme D-13 (331 fichiers analysés, 0 violation > 400 lignes).
- `node scripts/check-theme-classes.mjs` : 100 % conforme bi-thème (0 violation).
- `pnpm test --force` : 100 % vert (357 tests passants dans le monorepo).
- `pnpm build --force` : 100 % réussi.

### 7. Phase 2.2 — Production du Module `sauvegardes-stockage`
- **Module `sauvegardes-stockage`** (5 leçons, 5 quiz, 2 labs) :
  - `01-technologies-stockage-raid.md` + `quiz-technologies-stockage-raid.yaml` : Technologies de disques (HDD SAS/SATA, SSD NVMe U.2/PCIe), protocoles réseau DAS, NAS (NFS/SMB), SAN (iSCSI, Fibre Channel), RAID matériel vs logiciel (`mdadm`), niveaux RAID 0, 1, 5, 6, 10 (capacités, tolérances) et disques Hot-Spare.
  - `02-strategie-sauvegarde-3-2-1.md` + `quiz-strategie-sauvegarde-3-2-1.yaml` : Règle du 3-2-1-1-0 (immuabilité WORM / S3 Object Lock, Air-Gap, 0 erreur), typologie complète / différentielle / incrémentale / incrémentale inverse, déduplication au bloc et rétention GFS (_Grandfather-Father-Son_).
  - `03-outils-sauvegarde-linux.md` + `quiz-outils-sauvegarde-linux.yaml` : Synchronisation et miroirs `rsync` (`-a`, `--delete`, `--link-dest`), solutions dédupliquées BorgBackup / Restic, automatisation Cron (`/etc/cron.d/`) et Timers systemd, contrôle d'intégrité SHA-256.
  - `04-outils-sauvegarde-windows-veeam.md` + `quiz-outils-sauvegarde-windows-veeam.yaml` : Clichés instantanés Windows VSS (_Volume Shadow Copy Service_), sauvegarde de l'état du système Active Directory (System State) et mode DSRM, architecture Veeam Backup & Replication (Proxy, Repository Linux immuable, CBT, Instant VM Recovery).
  - `05-restauration-metriques-rto-rpo.md` + `quiz-restauration-metriques-rto-rpo.yaml` : Démarches PCA (haute disponibilité sans coupure) vs PRA (reconstruction après sinistre), métriques temporelles RTO, RPO, MTD ($RTO < MTD$), calendrier de tests périodiques de restauration ANSSI / ISO 27001 et matrice de criticité.
  - **2 Labs autonomes de niveau 2_files avec suites de tests complètes** :
    - `lab-script-backup-rsync` (`script-sauvegarde-rsync-rotation`) : Script Bash `backup.sh` avec mode strict `set -euo pipefail`, synchronisation `rsync` (-a, --delete, --exclude), calcul d'empreinte `sha256sum` dans `checksums.sha256`, rotation des archives de plus de 7 jours (`find -mtime`) et journalisation `backup.log`.
    - `lab-plan-pca-rpo` (`matrice-pca-pra-rpo-rto`) : Matrice de continuité d'activité `plan-continuite.csv` classant les 4 services d'entreprise (AD DS, ERP PostgreSQL, Fichiers, Logs) avec RTO cible, RPO cible, stratégies techniques et fréquence des tests de restauration.

### 8. Validations Globales Post-Sauvegardes
- `node content/validate.mjs` : **100 % valide** :
  - 6 modules opérationnels (`reseaux-fondamentaux`, `windows-server-ad`, `linux-administration`, `services-reseau-linux`, `virtualisation-systemes`, `sauvegardes-stockage`).
  - 34 leçons rédigées et validées.
  - 34 quiz d'évaluation (182 questions).
  - 16 ateliers pratiques (Labs).
  - **50 / 50 tests de validateurs passants** sur les suites de fixtures.
- `pnpm content:validate` : 100 % valide (18/18 tests Zod passants).
- `node scripts/check-file-size.mjs` : 100 % conforme D-13 (331 fichiers analysés, 0 violation > 400 lignes).
- `node scripts/check-theme-classes.mjs` : 100 % conforme bi-thème (0 violation).
- `pnpm test --force` : 100 % vert (357 tests passants dans le monorepo).
- `pnpm build --force` : 100 % réussi.

### 9. Phase 2.2 — Production du Module `support-parc-glpi`
- **Module `support-parc-glpi`** (5 leçons, 5 quiz, 2 labs) :
  - `01-principes-itil-et-support.md` + `quiz-principes-itil-et-support.yaml` : Référentiel ITIL v4, typologie des événements (Incident vs Demande de service vs Problème vs Changement), niveaux de support et chaîne d'escalade (N1, N2, N3), conventions de service (SLA, OLA, UC) et métriques TTO / TTR / FCR.
  - `02-architecture-glpi-et-deploiement.md` + `quiz-architecture-glpi-et-deploiement.yaml` : Architecture LAMP de GLPI (Apache/Nginx, MariaDB, PHP 8.2/8.3-FPM, cron), arborescence hiérarchique des entités (multi-sites, sous-entités, récursivité) et profils RBAC (Self-Service, Technician, Admin, Super-Admin).
  - `03-inventaire-automatise-agents.md` + `quiz-inventaire-automatise-agents.yaml` : Fonctionnement et télémétrie de GLPI Agent (rapports JSON, collecte matérielle et logicielle), déploiement massif par GPO Active Directory / script, découverte réseau et inventaire SNMP (switches, imprimantes, routeurs, association des ports LLDP/CDP et tables ARP).
  - `04-gestion-tickets-et-sla.md` + `quiz-gestion-tickets-et-sla.yaml` : Cycle de vie normalisé d'un ticket (Nouveau, En cours, En attente, Résolu, Clos), matrice de priorité Urgence / Impact, moteur de règles métier d'affectation automatique, et gestion des SLA (TTO, TTR, escalades automatiques).
  - `05-habilitations-et-cycle-de-vie.md` + `quiz-habilitations-et-cycle-de-vie.yaml` : Cycle de vie des actifs ITAM (Commande, En stock, En service, En réparation, Réforme D3E), effacement sécurisé NIST 800-88, gestion des licences logicielles (OEM, Volume, SaaS) et synchronisation d'annuaire Active Directory / LDAPS.
  - **2 Labs autonomes de niveau 2_files avec suites de tests complètes** :
    - `lab-regles-glpi` (`regles-routage-tickets-sla`) : Fichier déclaratif JSON `rules.json` configurant 3 règles métier complètes (incidents VIP avec SLA TTR $\le$ 2h / TTO $\le$ 15min, pannes réseau vers équipe Réseau SLA TTR $\le$ 4h, demandes bureautiques vers N1 SLA TTR $\le$ 24h).
    - `lab-inventaire-snmp` (`configuration-decouverte-snmp`) : Fichier déclaratif YAML `snmp-discovery.yaml` définissant la tâche d'inventaire réseau avec agent proxy, plages IP commutateurs (192.168.10.x) et copieurs (192.168.20.x), profils SNMP v2c et SNMP v3 sécurisé (`authPriv`, SHA, AES) et options de topologie LLDP/ARP.

### 10. Validations Globales Post-GLPI
- `node content/validate.mjs` : **100 % valide** :
  - 7 modules opérationnels (`reseaux-fondamentaux`, `windows-server-ad`, `linux-administration`, `services-reseau-linux`, `virtualisation-systemes`, `sauvegardes-stockage`, `support-parc-glpi`).
  - 39 leçons rédigées et validées.
  - 39 quiz d'évaluation (207 questions).
  - 18 ateliers pratiques (Labs).
  - **57 / 57 tests de validateurs passants** sur les suites de fixtures.
- `pnpm content:validate` : 100 % valide (18/18 tests Zod passants).
- `node scripts/check-file-size.mjs` : 100 % conforme D-13 (331 fichiers analysés, 0 violation > 400 lignes).
- `node scripts/check-theme-classes.mjs` : 100 % conforme bi-thème (0 violation).
- `pnpm test --force` : 100 % vert (357 tests passants dans le monorepo).
- `pnpm build --force` : 100 % réussi.

### 11. Phase 2.2 — Production du Module `anglais-technique` (Clôture Parcours 1ère Année SISR)
- **Module `anglais-technique`** (5 leçons, 5 quiz, 2 labs) :
  - `01-vocabulaire-infrastructure-reseau.md` + `quiz-vocabulaire-infrastructure-reseau.yaml` : Lexique anglophone du matériel serveur (chassis, rack, redundant PSUs, hot-swappable drives, NIC, HBA, throughput), connectique réseau (patch cord/panel, SFP+ transceivers, managed switches, default gateway) et pièges des faux-amis (legacy, facility, location, deprecate).
  - `02-lecture-documentation-et-rfcs.md` + `quiz-lecture-documentation-et-rfcs.yaml` : Mots-clés normatifs IETF RFC 2119 (MUST, MUST NOT, SHOULD, SHOULD NOT, MAY), structure formelle des pages de manuel UNIX/Linux (NAME, SYNOPSIS, OPTIONS, RETURN VALUE) et analyse de guides de déploiement éditeurs.
  - `03-tickets-incident-et-support.md` + `quiz-tickets-incident-et-support.yaml` : Rédaction de tickets d'assistance professionnels (Summary, Severity P1/P2/P3, Symptoms, Steps to Reproduce, Workaround, RCA), communication utilisateur polie en anglais et retours constructeur RMA.
  - `04-analyse-logs-et-messages-erreur.md` + `quiz-analyse-logs-et-messages-erreur.yaml` : Interprétation des niveaux Syslog RFC 5424 (Emergency à Debug), analyse des messages d'erreur système courants (`Connection refused`, `No space left on device`, `Permission denied`), codes d'état Web/HTTP et fiches de procédures d'exploitation (SOP).
  - `05-securite-sauvegardes-bonnes-pratiques.md` + `quiz-securite-sauvegardes-bonnes-pratiques.yaml` : Terminologie cyberdéfense (Vulnerabilities, CVE, CVSS Score, Exploits, Hardening, Patch Management), principes de sécurité (Least Privilege, Defense in Depth, Zero Trust, Air-Gap) et analyse de Security Advisories.
  - **2 Labs autonomes de niveau 2_files avec suites de tests complètes** :
    - `lab-ticket-support-anglais` (`redaction-ticket-support-anglais`) : Rédaction d'un rapport d'incident formel en anglais dans `ticket.md` qualifiant une panne critique PostgreSQL (ERP indisponible, 150 utilisateurs bloqués, diagnostic disque 100% plein, contournement 2 Go libérés et demande d'extension de partition de 50 Go au N2).
    - `lab-documentation-technique` (`analyse-documentation-technique-anglais`) : Analyse d'un avis de sécurité CVE-2026-4019 et d'un journal d'erreur Nginx/OpenSSL dans `diagnostic.json` avec qualification de sévérité Emergency/CVSS 9.8, plan de mise à niveau des paquets, durcissement TLSv1.2/1.3 et vérification sans coupure `nginx -t && systemctl reload nginx`.

### 12. Bilan Global — 100 % du Parcours 1ère Année SISR Finalisé
- `node content/validate.mjs` : **100 % valide** :
  - **8 modules opérationnels** (`reseaux-fondamentaux`, `windows-server-ad`, `linux-administration`, `services-reseau-linux`, `virtualisation-systemes`, `sauvegardes-stockage`, `support-parc-glpi`, `anglais-technique`).
  - **44 leçons rédigées et validées**.
  - **44 quiz d'évaluation (232 questions avec explications pédagogiques)**.
  - **20 ateliers pratiques (Labs)**.
  - **63 / 63 tests de validateurs passants** sur les suites de fixtures.
- `pnpm content:validate` : 100 % valide (18/18 tests Zod passants).
- `node scripts/check-file-size.mjs` : 100 % conforme D-13 (331 fichiers analysés, 0 violation > 400 lignes).
- `node scripts/check-theme-classes.mjs` : 100 % conforme bi-thème (0 violation).
### 13. Phase 2.3 — Initialisation du Parcours 2ème Année (`annee-2`)
- **Fichier de parcours `content/tracks/annee-2/track.yaml`** :
  - Slug : `annee-2`
  - Titre : `BTS SIO SISR — 2ème année`
  - Description : `Réseaux avancés et routage, sécurité périmétrique et filtrage, conteneurisation Docker, automatisation DevOps et cybersécurité.`
  - Position : 2
- **Module placeholder `content/tracks/annee-2/modules/routage-interconnexion/module.yaml`** :
  - Slug : `routage-interconnexion`
  - Titre : `Routage Dynamique, OSPF & Interconnexion Réseau`
  - Position : 1, Difficulté : 3, Estimation : 550 min, Blocs : B2.1, B2.2
  - Validation réussie de la structure multitrack par `@opensio/content-schema`, le moteur de synchronisation et `content/validate.mjs`.
- **Mise à jour de `docs/modules-map.md`** :
  - Mise à jour de l'état des lieux (8 modules de 1ère année complétés, 11 modules de 2ème année cartographiés).
- **Validations globales multitrack** :
  - `node content/validate.mjs` : 2 parcours, 9 modules, 44 leçons, 44 quiz, 20 labs, 63/63 tests validateurs passants (100 % valide).
  - `pnpm content:validate` : 18/18 tests passants.
  - `node scripts/check-file-size.mjs` : 100 % conforme D-13 (0 violation > 400 lignes).
  - `node scripts/check-theme-classes.mjs` : 100 % conforme bi-thème (0 violation).
  - `pnpm test --force` : 100 % vert (357 tests passants dans le monorepo).
  - `pnpm build --force` : 100 % réussi.

### 14. Phase 2.3 — Production du Module `routage-interconnexion` (2ème Année SISR)
- **Module `routage-interconnexion`** (5 leçons, 5 quiz, 2 labs) :
  - `01-principes-routage-statique-dynamique.md` + `quiz-principes-routage-statique-dynamique.yaml` : Fonctionnement de la couche 3 (RIB, FIB, saut par saut), règle du masque le plus long, routage statique, distance administrative (AD) et routes statiques flottantes (Floating routes), taxonomie des protocoles dynamiques (IGP/EGP, Vecteur de distance vs État de liens).
  - `02-protocole-ospf-architecture-et-etats.md` + `quiz-protocole-ospf-architecture-et-etats.yaml` : Architecture hiérarchique OSPFv2 (Backbone Area 0, routeurs ABR et ASBR), machine à 7 états d'adjacence (Down à Full), élection DR/BDR sur réseaux broadcast, calcul du coût et réajustement de la bande passante de référence (`auto-cost reference-bandwidth 100000`).
  - `03-routage-inter-vlan-sous-interfaces.md` + `quiz-routage-inter-vlan-sous-interfaces.yaml` : Isolation de niveau 2 des VLANs, architecture Router-on-a-Stick (RoaS) avec liaisons Trunk 802.1Q et sous-interfaces `encapsulation dot1Q`, routage matériel sur commutateurs de niveau 3 via interfaces virtuelles SVI (`interface Vlan <id>`) et comparatif technique de performance.
  - `04-nat-pat-et-routage-par-defaut.md` + `quiz-nat-pat-et-routage-par-defaut.yaml` : Translation d'adresses privées (RFC 1918), NAT statique 1:1, PAT / Surcharge / Masquerade avec réécriture de ports TCP/UDP, route par défaut (0.0.0.0/0) et injection OSPF `default-information originate`, architecture d'interconnexion multi-sites.
  - `05-supervision-et-diagnostic-routage.md` + `quiz-supervision-et-diagnostic-routage.yaml` : Lecture de la table de routage (`show ip route`, codes C, S, O, O IA, O*E2), diagnostic de sessions de voisinage (`show ip ospf neighbor`), résolution du blocage ExStart/Exchange (MTU Mismatch), détection de boucles de routage (TTL Expired) et impact du routage asymétrique sur les pare-feu d'état.
  - **2 Labs autonomes de niveau 2_files avec suites de tests complètes** :
    - `lab-config-ospf` (`configuration-routage-dynamique-ospf`) : Configuration complète du routeur R1-CORE sous FRRouting dans `frr.conf` (Router-ID 10.255.255.1, référence 100 Gbps, annonces Area 0, coûts eth1=10 et eth2=100, passive-interface eth0 et default-information originate).
    - `lab-routage-inter-vlan` (`configuration-routage-inter-vlan`) : Configuration Cisco IOS dans `intervlan.ios` du routeur RoaS (sous-interfaces .10, .20, .30 dot1Q) et du switch L3 (activation `ip routing`, VLANs 10/20/30, SVIs Vlan10/20/30 et port Trunk).

### 15. Validations Globales Post-Routage-Interconnexion
- `node content/validate.mjs` : **100 % valide** :
  - **2 parcours opérationnels** (`annee-1`, `annee-2`).
  - **9 modules opérationnels** (8 en 1ère année, 1 en 2ème année).
  - **49 leçons rédigées et validées**.
  - **49 quiz d'évaluation (257 questions avec explications pédagogiques)**.
  - **22 ateliers pratiques (Labs)**.
  - **69 / 69 tests de validateurs passants** sur les suites de fixtures.
- `pnpm content:validate` : 100 % valide (18/18 tests Zod passants).
- `node scripts/check-file-size.mjs` : 100 % conforme D-13 (331 fichiers analysés, 0 violation > 400 lignes).
- `node scripts/check-theme-classes.mjs` : 100 % conforme bi-thème (0 violation).
- `pnpm test --force` : 100 % vert (357 tests passants dans le monorepo).
- `pnpm build --force` : 100 % réussi.

### 16. Phase 2.3 — Production du Module `securite-perimetrique` (2ème Année SISR)
- **Module `securite-perimetrique`** (5 leçons, 5 quiz, 2 labs) :
  - `01-principes-securite-perimetrique-zones.md` + `quiz-principes-securite-perimetrique-zones.yaml` : Modèle périmétrique vs Zero Trust ("Never trust, always verify"), découpage en zones de sécurité (LAN, DMZ, WAN, Management OOB), règle d'or d'étanchéité de la DMZ (aucun flux initié vers le LAN), principes de Défense en Profondeur et matrice d'urbanisation de flux d'entreprise.
  - `02-pare-feu-stateful-et-filtrage.md` + `quiz-pare-feu-stateful-et-filtrage.yaml` : Filtrage sans état (Stateless) vs avec état (Stateful Inspection), module conntrack Linux et ses 4 états de session (NEW, ESTABLISHED, RELATED, INVALID), syntaxe et architecture `nftables` (famille `inet`, chaînes `input`, `forward`, `output` avec politique `policy drop`), audit et journalisation.
  - `03-nat-securise-et-exposition-services.md` + `quiz-nat-securise-et-exposition-services.yaml` : Analyse des risques de l'exposition directe de serveurs, architecture de publication sécurisée en DMZ (Reverse Proxy Nginx, WAF), configuration du DNAT (Port Forwarding) et SNAT / Masquerade sous `nftables`, réduction de la surface d'attaque (Rate Limiting, IP Whitelisting).
  - `04-vpn-site-a-site-et-acces-distants.md` + `quiz-vpn-site-a-site-et-acces-distants.yaml` : Propriétés de sécurité VPN (Confidentialité, Intégrité HMAC, Authentification, Anti-Rejeu), topologies Site-à-Site vs Nomade, comparatif IPsec (IKEv2/ESP) vs WireGuard vs OpenVPN, cryptokey routing WireGuard et recommandations ANSSI (PFS, AES-GCM, ChaCha20-Poly1305).
  - `05-durcissement-perimetrique-et-protection.md` + `quiz-durcissement-perimetrique-et-protection.yaml` : Durcissement des équipements réseau (bannissement Telnet/HTTP/SNMPv1-v2, forçage SSHv2 avec clés asymétriques, architecture AAA avec RADIUS/TACACS+), protection anti-usurpation uRPF, sécurisation de couche 2 sur commutateurs (DHCP Snooping, Dynamic ARP Inspection, Port Security) et mitigation anti-DDoS (SYN Cookies).
  - **2 Labs autonomes de niveau 2_files avec suites de tests complètes** :
    - `lab-regles-pare-feu` (`configuration-pare-feu-stateful-nftables`) : Configuration complète du pare-feu avec état sous `nftables` dans `nftables.conf` (flush ruleset, tables inet filter et ip nat, chaînes input/forward en policy drop, conntrack, flux LAN->WAN, WAN->DMZ ports 80/443, DNAT vers 192.168.50.10, Masquerade sur eth1 et confinement DMZ).
    - `lab-vpn-site-a-site` (`configuration-tunnel-vpn-wireguard`) : Configuration complète du tunnel VPN WireGuard dans `wg0.conf` sur la passerelle Siège (Address 10.100.0.1/30, ListenPort 51820, PrivateKey, PublicKey distante, Endpoint 198.51.100.20:51820, AllowedIPs incluant 10.100.0.2/32 et 192.168.20.0/24, PersistentKeepalive 25).

### 17. Validations Globales Post-Sécurité-Périmétrique
- `node content/validate.mjs` : **100 % valide** :
  - **2 parcours opérationnels** (`annee-1`, `annee-2`).
  - **10 modules opérationnels** (8 en 1ère année, 2 en 2ème année).
  - **54 leçons rédigées et validées**.
  - **54 quiz d'évaluation (282 questions avec explications pédagogiques)**.
  - **24 ateliers pratiques (Labs)**.
  - **75 / 75 tests de validateurs passants** sur les suites de fixtures.
- `pnpm content:validate` : 100 % valide (18/18 tests Zod passants).
- `node scripts/check-file-size.mjs` : 100 % conforme D-13 (331 fichiers analysés, 0 violation > 400 lignes).
- `node scripts/check-theme-classes.mjs` : 100 % conforme bi-thème (0 violation).
- `pnpm test --force` : 100 % vert (357 tests passants dans le monorepo).
- `pnpm build --force` : 100 % réussi.

### 18. Phase 2.3 — Production du Module `conteneurisation-docker` (2ème Année SISR)
- **Module `conteneurisation-docker`** (5 leçons, 5 quiz, 2 labs) :
  - `01-principes-conteneurisation-et-cycle-vie.md` + `quiz-principes-conteneurisation-et-cycle-vie.yaml` : Virtualisation classique (VM / hyperviseur) vs Conteneurisation (OS-level virtualization), mécanismes noyau Linux (`namespaces` pour l'isolation et `cgroups` pour la limitation matérielle), calques en lecture seule d'images et couche d'écriture éphémère Copy-on-Write (Overlay2), cycle de vie complet (`run`, `exec`, `logs`, `stop` avec signal SIGTERM, `rm`, `prune`).
  - `02-dockerfile-construction-et-bonnes-pratiques.md` + `quiz-dockerfile-construction-et-bonnes-pratiques.yaml` : Instructions d'un Dockerfile (`FROM`, `WORKDIR`, `COPY`, `RUN`, `ENV`, `EXPOSE`, `USER`, `CMD` vs `ENTRYPOINT`), exploitation du cache de calques (copie ordonnée des dépendances), fichier `.dockerignore`, sécurité non-root et construction multi-étapes (**Multi-Stage Builds**) réduisant la taille des images de 90 %.
  - `03-reseau-docker-et-communication-inter-conteneurs.md` + `quiz-reseau-docker-et-communication-inter-conteneurs.yaml` : Pilotes de réseau Docker (`bridge`, `host`, `none`, `macvlan`, `overlay`), publication et mappage de ports (`-p hôte:conteneur`), réseaux personnalisés (User-Defined Bridges) et serveur DNS intégré de Docker (`127.0.0.11`) pour la découverte automatique par nom de conteneur.
  - `04-volumes-stockage-et-persistance.md` + `quiz-volumes-stockage-et-persistance.yaml` : Éphémérité du stockage conteneurisé par défaut, comparaison des 3 modes de persistance (Volumes nommés gérés par Docker, Bind Mounts pour le développement et l'injection de conf `:ro`, tmpfs en mémoire vive), procédures de sauvegarde et restauration de volumes via conteneur éphémère.
  - `05-orchestration-multi-services-docker-compose.md` + `quiz-orchestration-multi-services-docker-compose.yaml` : Orchestration 3-tiers multi-conteneurs avec Docker Compose (`compose.yaml`), segmentation réseau isolée (frontend/backend), sondes de santé (`healthcheck` avec `pg_isready`), démarrage ordonné (`depends_on` avec `condition: service_healthy`), politiques de redémarrage `restart: unless-stopped` et mise à l'échelle (`--scale`).
  - **2 Labs autonomes de niveau 2_files avec suites de tests complètes** :
    - `lab-dockerfile-application` (`construction-image-docker-optimisee`) : Conception d'un Dockerfile multi-stage pour une API Node.js TypeScript (étape builder avec cache package*.json et `npm ci`, étape production minimale avec `COPY --from=builder`, variable `ENV NODE_ENV=production`, `USER node` non-root et `CMD ["node", "dist/main.js"]`).
    - `lab-docker-compose-services` (`deploiement-stack-docker-compose`) : Conception d'un fichier `docker-compose.yml` complet pour une pile 3-tiers (proxy Nginx port 80 sur frontend-net, backend Node.js sur frontend-net et backend-net avec healthcheck, database PostgreSQL sur backend-net avec volume nommé `db_data` et healthcheck `pg_isready`, cache Redis sur backend-net, et `restart: unless-stopped`).

### 19. Validations Globales Post-Conteneurisation-Docker
- `node content/validate.mjs` : **100 % valide** :
  - **2 parcours opérationnels** (`annee-1`, `annee-2`).
  - **11 modules opérationnels** (8 en 1ère année, 3 en 2ème année).
  - **59 leçons rédigées et validées**.
  - **59 quiz d'évaluation (307 questions avec explications pédagogiques)**.
  - **26 ateliers pratiques (Labs)**.
  - **81 / 81 tests de validateurs passants** sur les suites de fixtures.
- `pnpm content:validate` : 100 % valide (18/18 tests Zod passants).
- `node scripts/check-file-size.mjs` : 100 % conforme D-13 (331 fichiers analysés, 0 violation > 400 lignes).
- `node scripts/check-theme-classes.mjs` : 100 % conforme bi-thème (0 violation).
- `pnpm test --force` : 100 % vert (357 tests passants dans le monorepo).
- `pnpm build --force` : 100 % réussi.

### 20. Phase 2.3 — Production du Module `automatisation-devops` (2ème Année SISR)
- **Module `automatisation-devops`** (5 leçons, 5 quiz, 2 labs) :
  - `01-principes-devops-et-culture-cicd.md` + `quiz-principes-devops-et-culture-cicd.yaml` : Mouvement DevOps, décloisonnement Dev et Ops, modèle CAMS (Culture, Automation, Measurement, Sharing), continuum CI/CD (Intégration Continue, Livraison Continue avec validation humaine vs Déploiement Continu automatisé de bout en bout), métriques d'ingénierie DORA et Shift-Left Testing.
  - `02-gestion-configuration-ansible.md` + `quiz-gestion-configuration-ansible.yaml` : Architecture sans agent (Agentless via SSH / Python), inventaires d'hôtes et variables, modules idempotents (`apt`, `template`, `file`, `systemd`), playbooks YAML, templates Jinja2 (`.j2`), élévation `become: true`, et exécution conditionnelle de `handlers` de rechargement.
  - `03-pipelines-cicd-github-actions-gitlab-ci.md` + `quiz-pipelines-cicd-github-actions-gitlab-ci.yaml` : Pipelines CI/CD modernes, structure YAML des workflows, déclencheurs `push`/`pull_request`, exécuteurs `runs-on: ubuntu-latest`, dépendances ordonnées `needs: [test]`, sécurisation par GitHub Secrets chiffrés, mise en cache npm et stratégies de déploiement (Rolling, Blue/Green, Canary).
  - `04-infrastructure-as-code-terraform.md` + `quiz-infrastructure-as-code-terraform.yaml` : Approche déclarative de l'IaC avec Terraform / OpenTofu, fournisseurs (Providers Cloud, Proxmox, Docker), blocs `resource` et `data`, rôle critique du fichier d'état `terraform.tfstate` avec Remote Backend et verrouillage d'état, cycle de vie (`init`, `plan`, `apply`, `destroy`), variables et outputs.
  - `05-supervision-observabilite-prometheus-grafana.md` + `quiz-supervision-observabilite-prometheus-grafana.yaml` : Piliers de l'observabilité (Logs, Métriques, Traces), modèle de tirage périodique (Pull Scraping) de Prometheus, exportateurs (`node_exporter`, `cAdvisor`), requêtes PromQL (`rate()`, agrégations), Alertmanager, tableaux de bord Grafana et concepts SRE (SLI, SLO, SLA, Budget d'erreur).
  - **2 Labs autonomes de niveau 2_files avec suites de tests complètes** :
    - `lab-ansible-deploiement` (`deploiement-automatise-ansible`) : Conception d'un playbook Ansible `playbook.yml` complet pour provisionner Nginx sur le groupe `webservers` (installation `apt`, template Jinja2 vers `sites-available/app.conf`, lien symbolique `sites-enabled/app.conf`, suppression de `default`, activation du service `systemd` et handler `state: reloaded`).
    - `lab-pipeline-cicd` (`definition-pipeline-cicd-github-actions`) : Conception d'un workflow GitHub Actions `deploy.yml` complet (déclencheurs `push`/`pull_request` sur `main`, job `test` avec `actions/checkout`, `actions/setup-node`, `npm ci`, `npm run lint`, `npm test`, et job `deploy` avec `needs: test`, condition `main`, build, archivage d'artefacts `actions/upload-artifact@v4` et secret chiffré).

### 21. Validations Globales Post-Automatisation-DevOps
- `node content/validate.mjs` : **100 % valide** :
  - **2 parcours opérationnels** (`annee-1`, `annee-2`).
  - **12 modules opérationnels** (8 en 1ère année, 4 en 2ème année).
  - **64 leçons rédigées et validées**.
  - **64 quiz d'évaluation (332 questions avec explications pédagogiques)**.
  - **28 ateliers pratiques (Labs)**.
  - **87 / 87 tests de validateurs passants** sur les suites de fixtures.
- `pnpm content:validate` : 100 % valide (18/18 tests Zod passants).
- `node scripts/check-file-size.mjs` : 100 % conforme D-13 (331 fichiers analysés, 0 violation > 400 lignes).
- `node scripts/check-theme-classes.mjs` : 100 % conforme bi-thème (0 violation).
- `pnpm test --force` : 100 % vert (357 tests passants dans le monorepo).
- `pnpm build --force` : 100 % réussi.

### 22. Phase 2.3 — Production du Module `supervision-observabilite` (2ème Année SISR)
- **Module `supervision-observabilite`** (5 leçons, 5 quiz, 2 labs) :
  - `01-concepts-supervision-alerting-sli-slo.md` + `quiz-concepts-supervision-alerting-sli-slo.yaml` : Supervision en boîte noire vs Observabilité en boîte blanche, cycle de vie d'une alerte, prévention de la fatigue des alertes (Alert Fatigue), importance des Runbooks d'exploitation, et indicateurs SRE (SLI, SLO, SLA, Budget d'erreur).
  - `02-collecte-metriques-promql-retention.md` + `quiz-collecte-metriques-promql-retention.yaml` : Modèle de données des séries temporelles (Time Series), collecte par tirage (Pull Scraping), 4 types de métriques (Counter, Gauge, Histogram, Summary), requêtes PromQL avancées (`rate()`, `histogram_quantile(0.95, ...)`), stockage TSDB, rétention et prévention de l'explosion de cardinalité.
  - `03-visualisation-tableaux-bord-grafana.md` + `quiz-visualisation-tableaux-bord-grafana.yaml` : Architecture de Grafana, types de panels (Time Series, Stat, Gauge, Heatmap), variables de dashboard dynamiques (`$instance`), annotations temporelles d'événements, méthode USE pour l'infrastructure (Utilization, Saturation, Errors) et méthode RED pour les services applicatifs (Rate, Errors, Duration).
  - `04-gestion-centralisation-logs-loki.md` + `quiz-gestion-centralisation-logs-loki.yaml` : Enjeux de la centralisation des logs, comparatif architectural Elasticsearch (ELK) vs Grafana Loki, agent de collecte Promtail (scraping `/var/log/*`, pipeline stages JSON et mapping de labels), requêtes de filtrage et de métriques LogQL (`|=`, `|~`, `rate()`).
  - `05-traces-distribuees-observabilite-opentelemetry.md` + `quiz-traces-distribuees-observabilite-opentelemetry.yaml` : Traçage distribué dans les microservices, concepts de Trace, Span, Span ID et arbre d'exécution hiérarchique, propagation de contexte HTTP W3C Trace Context (`traceparent`), architecture du collecteur OpenTelemetry (Receivers, Processors, Exporters), et corrélation complète Métriques / Traces / Logs via `trace_id`.
  - **2 Labs autonomes de niveau 2_files avec suites de tests complètes** :
    - `lab-prometheus-grafana` (`configuration-supervision-prometheus-grafana`) : Configuration de Prometheus (`prometheus.yml` avec intervalles, `alerts.yml`, jobs `node-exporter` et `nginx-exporter`) et règles d'alerte (`InstanceDown` sur `up == 0`, `HighCpuUsage` avec calcul PromQL, `for: 5m`, `severity: warning/critical`, `summary` et `description`).
    - `lab-centralisation-logs` (`centralisation-logs-promtail-loki`) : Configuration de Promtail (`promtail-config.yml` avec écoute 9080, positions, client Loki, scrape `/var/log/nginx/*.log`, pipeline_stages JSON avec label `status`) et requêtes LogQL (`queries.logql` avec filtrage d'erreurs 5xx et métrique `rate()` par hôte).

### 23. Validations Globales Post-Supervision-Observabilite
- `node content/validate.mjs` : **100 % valide** :
  - **2 parcours opérationnels** (`annee-1`, `annee-2`).
  - **13 modules opérationnels** (8 en 1ère année, 5 en 2ème année).
  - **69 leçons rédigées et validées**.
  - **69 quiz d'évaluation (357 questions avec explications pédagogiques)**.
  - **30 ateliers pratiques (Labs)**.
  - **93 / 93 tests de validateurs passants** sur les suites de fixtures.
- `pnpm content:validate` : 100 % valide (18/18 tests Zod passants).
- `node scripts/check-file-size.mjs` : 100 % conforme D-13 (331 fichiers analysés, 0 violation > 400 lignes).
- `node scripts/check-theme-classes.mjs` : 100 % conforme bi-thème (0 violation).
- `pnpm test --force` : 100 % vert (357 tests passants dans le monorepo).
- `pnpm build --force` : 100 % réussi.

### 24. Phase 2.3 — Production du Module `cloud-prive-virtualisation` (2ème Année SISR)
- **Module `cloud-prive-virtualisation`** (5 leçons, 5 quiz, 2 labs) :
  - `01-concepts-cloud-computing-modeles-hybrides.md` + `quiz-concepts-cloud-computing-modeles-hybrides.yaml` : Modèles de service IaaS/PaaS/SaaS (NIST), modèles de déploiement (Public, Privé, Hybride, Multi-Cloud), impacts financiers CapEx vs OpEx, souveraineté numérique, RGPD, qualification SecNumCloud de l'ANSSI et Cloud Bursting.
  - `02-virtualisation-avancee-kvm-libvirt-clusters.md` + `quiz-virtualisation-avancee-kvm-libvirt-clusters.yaml` : Module noyau KVM, émulateur QEMU, pilotes paravirtualisés VirtIO, gestion en CLI via libvirt et `virsh`, stockage distribué Ceph RBD/iSCSI, Live Migration sans coupure, Quorum Corosync et Fencing (STONITH) anti-Split-Brain.
  - `03-plateforme-cloud-prive-proxmox-openstack.md` + `quiz-plateforme-cloud-prive-proxmox-openstack.yaml` : Architecture hyperconvergée Proxmox VE (pmxcfs, SDN, Ceph), architecture modulaire OpenStack (Keystone, Nova, Neutron, Cinder, Glance, Horizon), isolation multi-tenant, pools de ressources, quotas stricts et réseaux VXLAN.
  - `04-orchestration-hybridation-vm-conteneurs.md` + `quiz-orchestration-hybridation-vm-conteneurs.yaml` : Coexistence des paradigmes VMs (KVM) et Conteneurs (LXC/Docker/Kubernetes), virtualisation imbriquée (Nested Virtualization), provisionnement instantané par Templates et Clones Liés (Linked Clones), automatisation au boot par Cloud-Init (`user-data`), et pilotage déclaratif IaC.
  - `05-exploitation-supervision-securite-cloud-prive.md` + `quiz-exploitation-supervision-securite-cloud-prive.yaml` : Capacity Planning, gestion de l'Overcommitment CPU/RAM (KSM, Ballooning), sauvegardes dédupliquées par blocs (Proxmox Backup Server / Dirty Bitmaps QEMU), segmentation réseau des flux (Management OOB, Corosync, Stockage, Public) et durcissement des accès hyperviseurs.
  - **2 Labs autonomes de niveau 2_files avec suites de tests complètes** :
    - `lab-deploiement-cloud-prive` (`configuration-cluster-cloud-prive`) : Conception de la topologie d'un cluster Cloud Privé (`cluster-config.yml` avec 3 nœuds, réseau de cluster dédié, HA activée et pool multi-tenant `project-data` avec quotas) et réseau SDN (`sdn-zones.cfg` avec zone VXLAN `zone-prod`, MTU 1450, pairs et VNets frontend/backend avec sous-réseaux et passerelles).
    - `lab-orchestration-vm` (`orchestration-vm-templates-cloudinit`) : Automatisation de VM avec Cloud-Init (`user-data` avec entête `#cloud-config`, hostname, utilisateur `devops` sudo sans mdp + clé SSH, paquets `qemu-guest-agent`/`nginx` et `runcmd`) et manifeste d'orchestration (`vm-orchestration.yml` avec template ID 9000, clone lié `linked`, sizing, attachement au VNet SDN et snapshot initial `snapshot_before_deploy: true`).

### 25. Validations Globales Post-Cloud-Prive-Virtualisation
- `node content/validate.mjs` : **100 % valide** :
  - **2 parcours opérationnels** (`annee-1`, `annee-2`).
  - **14 modules opérationnels** (8 en 1ère année, 6 en 2ème année).
  - **74 leçons rédigées et validées**.
  - **74 quiz d'évaluation (382 questions avec explications pédagogiques)**.
  - **32 ateliers pratiques (Labs)**.
  - **99 / 99 tests de validateurs passants** sur les suites de fixtures.
- `pnpm content:validate` : 100 % valide (18/18 tests Zod passants).
- `node scripts/check-file-size.mjs` : 100 % conforme D-13 (331 fichiers analysés, 0 violation > 400 lignes).
- `node scripts/check-theme-classes.mjs` : 100 % conforme bi-thème (0 violation).
- `pnpm test --force` : 100 % vert (357 tests passants dans le monorepo).
- `pnpm build --force` : 100 % réussi.












