<div align="center">

# 🎓 OpenSIO

![Page d'accueil OpenSIO](docs/assets/accueil.png)

**La plateforme d'entraînement et d'auto-évaluation pour le BTS SIO option SISR**

[![Version](https://img.shields.io/badge/version-v0.2.0--distribution-blue.svg)](package.json)
[![CI](https://github.com/Klemz-696/opensio/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Klemz-696/opensio/actions/workflows/ci.yml)
[![Licence MIT](https://img.shields.io/badge/Licence-MIT-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)](https://nestjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](docker-compose.prod.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

</div>

---

## ⚡ Installation en une commande

N'importe qui peut installer et démarrer OpenSIO — sur un PC de développement ou sur un serveur de production — via **une seule commande interactive** qui vérifie tous les prérequis :

### 🪟 Windows (PowerShell)
```powershell
irm https://raw.githubusercontent.com/Klemz-696/opensio/main/scripts/install.ps1 | iex
```

### 🐧 Linux & 🍎 macOS (Bash / Zsh)
```bash
curl -fsSL https://raw.githubusercontent.com/Klemz-696/opensio/main/scripts/install.sh | bash
```

> 📖 Consultez le **[Guide d'installation complet](docs/installation.md)** et le **[Guide de déploiement Homelab / Proxmox](docs/deployment.md)** pour les détails d'exploitation.

---

## 📖 À propos

**OpenSIO** est une plateforme web pédagogique moderne, sécurisée et auto-hébergeable conçue pour les étudiants de **BTS SIO option SISR** (_Solutions d'Infrastructure, Systèmes et Réseaux_).

Elle regroupe l'ensemble du cycle d'apprentissage pratique dans une application unifiée :

- 📚 **Cours théoriques structurés** en Markdown avec coloration syntaxique et métadonnées pédagogiques
- ✅ **Quiz d'auto-évaluation interactifs** avec correction serveur stricte et explications pédagogiques
- 🧪 **Ateliers pratiques (Labs)** avec éditeur multi-fichiers, terminal virtuel sécurisé et validation automatique
- 🤖 **Assistant Mentor IA** local (Ollama) ou distant (OpenAI) agissant comme un tuteur méthodologique socratique
- 📊 **Tableau de bord apprenant** avec suivi de progression fin, reprise rapide et recommandations

> Le projet a été développé dans le respect strict d'un cahier des charges contractuel (_blueprint_), avec une gouvernance exemplaire (règle D-13 ≤ 400 lignes/fichier, 235 tests automatisés, zéro fuite de données d'évaluation).

---

## 🚀 Fonctionnalités livrées (v0.1.0 MVP)

| Domaine                       | Fonctionnalité              | Description & Garanties                                                                                                                                                                                                                                                                           |
| ----------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Socle & Données**           | Monorepo & Schéma Prisma    | Monorepo Turborepo + pnpm workspaces, 15 tables PostgreSQL réparties en schémas modulaires, migrations versionnées et seed initial Argon2id.                                                                                                                                                      |
| **Contenu & Synchronisation** | Git as Source of Truth      | Schémas Zod stricts pour parcours, modules, leçons, quiz et labs. Moteur `content:sync` transactionnel, atomique et 100 % idempotent.                                                                                                                                                             |
| **Authentification**          | Sécurité D-09 & RBAC        | JWT 15 min en mémoire vive (jamais en `localStorage`), refresh tokens opaques rotatifs (cookie `HttpOnly; SameSite=Lax`) avec détection de réutilisation, hachage Argon2id (64 Mio).                                                                                                              |
| **Catalogue & Cours**         | Navigation & Rendu Markdown | Organisation par cursus et modules (difficulté, durée, référentiel BTS). Rendu Markdown sécurisé (`rehype-sanitize`), coloration syntaxique Shiki et protection anti-traversée de chemin.                                                                                                         |
| **Quiz interactifs**          | Évaluation Zéro-Fuite       | QCM à choix unique et multiple. Les bonnes réponses et explications ne quittent jamais le serveur. Seuil de validation à 80 % (RM-01), historique et déduplication d'idempotence.                                                                                                                 |
| **Progression**               | Suivi & Tableau de bord     | Heartbeat de lecture (30s), complétion de module selon la règle RM-03, reprise rapide (« Reprendre où j'en étais »), timeline d'activité et recommandations intelligentes.                                                                                                                        |
| **Ateliers pratiques (Labs)** | Runner & Cycle de vie       | Machine à états de session (`RUNNING` → `PASSED`/`FAILED`/`EXPIRED`), éditeur multi-fichiers, indices pénalisés (RM-05), validation par runner découplé et sweeper automatique des bacs à sable expirés.                                                                                          |
| **Terminal & Mentor IA**      | Terminal sécurisé & Tuteur  | Terminal virtuel interactif avec liste blanche stricte de 15 commandes système (zéro injection), passerelle WebSocket JWT. Assistant IA double mode (Ollama local / OpenAI), consignes Socratiques zéro-spoil (RM-11), détection de contournement, mode libre hors évaluation et quotas horaires. |

---

## 🖼️ Aperçu de l'interface

<div align="center">

|      Tableau de bord apprenant      |        Détail d'un module & labs        |
| :---------------------------------: | :-------------------------------------: |
| ![Accueil](docs/assets/accueil.png) | ![Catalogue](docs/assets/catalogue.png) |

|       Leçon avec coloration Shiki       |         Quiz interactif corrigé          |
| :-------------------------------------: | :--------------------------------------: |
| ![Leçon OpenSIO](docs/assets/lecon.gif) | ![Résultat](docs/assets/quiz-result.png) |

</div>

---

## 🛠️ Stack technique

| Couche               | Technologies & Librairies                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| **Frontend**         | Next.js 15 (App Router, React 19, Turbopack), Tailwind CSS, Shiki, Lucide Icons                   |
| **Backend**          | NestJS 11 (monolithe modulaire), WebSocket Gateway (`@nestjs/platform-ws`), Prisma 6              |
| **Base de données**  | PostgreSQL 18 Alpine (Docker)                                                                     |
| **Contenu**          | Markdown + Frontmatter YAML, Schémas Zod, Gray-Matter                                             |
| **IA (Optionnelle)** | Ollama en local (`llama3.1:8b`) ou provider OpenAI-compatible                                     |
| **Qualité & CI**     | Vitest (235 tests automatisés), ESLint 9 (Flat config), TypeScript 5.7, Turborepo, GitHub Actions |
| **Sécurité**         | Argon2id, JWT HS256, HTTP cookies HttpOnly, rehype-sanitize, rate-limiting, audit logs            |

---

## 🏗️ Architecture du dépôt

```
opensio/
├── apps/
│   ├── api/                # Backend REST & WebSocket NestJS (port 4000)
│   └── web/                # Frontend Next.js 15 App Router (port 3000)
├── packages/
│   ├── config/             # Configurations partagées (TS, ESLint, Tailwind)
│   └── content-schema/     # Schémas Zod et validateurs du contenu pédagogique
├── content/                # Contenu source du référentiel BTS SIO SISR (Markdown/YAML)
│   └── tracks/annee-1/     # Parcours 1ère année, modules, cours, quiz et ateliers
├── infra/docker/           # Définition Docker Compose PostgreSQL pour le dev
├── scripts/                # Contrôle de gouvernance et conformité D-13
└── docs/                   # Documentation technique, roadmap et guide de contenu
```

---

## 🚀 Démarrage rapide (Quickstart)

### 1. Prérequis

- **Node.js** : version 22 LTS ou 24
- **pnpm** : version ≥ 10.0 (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Docker Desktop** ou **Docker Engine** avec Docker Compose

---

### 2. Installation & Configuration

```bash
# 1. Cloner le dépôt et entrer dans le dossier
git clone https://github.com/Klemz-696/opensio.git
cd opensio

# 2. Installer l'ensemble des dépendances du monorepo
pnpm install

# 3. Créer le fichier de configuration d'environnement local
# Sous Linux / macOS :
cp .env.example .env
# Sous Windows (PowerShell) :
copy .env.example .env
```

---

### 3. Démarrage de la base de données & Initialisation

```bash
# 4. Lancer le conteneur PostgreSQL 18
docker compose -f infra/docker/docker-compose.dev.yml up -d

# 5. Appliquer les migrations de schéma Prisma
pnpm db:migrate

# 6. Peupler la base avec les comptes initiaux de test
pnpm seed

# 7. Synchroniser le contenu pédagogique du dossier content/ en base
pnpm content:sync
```

---

### 4. Lancement de l'application

```bash
# 8. Démarrer l'API et le Frontend en parallèle avec Turborepo
pnpm dev
```

Les services sont immédiatement disponibles sur :

- 🌐 **Frontend Web** : [http://localhost:3000](http://localhost:3000)
- 🔌 **API Backend** : [http://localhost:4000/api/v1](http://localhost:4000/api/v1)
- 🩺 **Sonde de santé** : [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)

---

### 5. Comptes de démonstration (Développement local)

| Rôle                  | Adresse email           | Mot de passe          |
| --------------------- | ----------------------- | --------------------- |
| 🎓 **Étudiant**       | `student@opensio.local` | `StudentOpenSIO2026!` |
| 🛡️ **Administrateur** | `admin@opensio.local`   | `AdminOpenSIO2026!`   |

---

### 6. Activation de l'Assistant Mentor IA (Optionnel)

L'assistant Mentor IA fonctionne nativement avec **Ollama** en local (confidentialité totale, 0 donnée sortante) :

1. **Installer et lancer Ollama** : [https://ollama.ai](https://ollama.ai)
2. **Télécharger le modèle recommandé** :
   ```bash
   ollama pull llama3.1:8b
   ```
3. **Activer l'IA dans votre fichier `.env`** :
   ```env
   AI_ENABLED=true
   AI_PROVIDER=openai-compatible
   AI_BASE_URL=http://127.0.0.1:11434/v1
   AI_MODEL=llama3.1:8b
   AI_TIMEOUT_MS=120000
   ```
   > 💡 **Note Windows** : Utilisez impérativement `http://127.0.0.1:11434/v1` plutôt que `localhost` pour éviter les lenteurs de résolution IPv6 (`::1`).

---

## 🧪 Démos & Preuves Rejouables

Le projet inclut une suite complète de scripts de démonstration autonome dans `apps/api/test/`. Ces scripts démarrent une instance NestJS complète, effectuent de réels appels HTTP / WebSocket contre PostgreSQL et valident l'ensemble des scénarios de test.

Pour exécuter une démonstration, assurez-vous que PostgreSQL est démarré (`docker compose ... up -d`) et lancez :

```bash
# Démo Lot 3 — Authentification complète (Register, Login, Rotation Refresh, Détection réutilisation)
pnpm --filter @opensio/api exec tsx test/demo-auth.ts

# Démo Lot 4 — Catalogue, consultation des cours et protection anti-traversée
pnpm --filter @opensio/api exec tsx test/demo-lot4.ts

# Démo Lot 5 — Passation des quiz, calcul de score, zéro-fuite et idempotence
pnpm --filter @opensio/api exec tsx test/demo-lot5.ts

# Démo Lot 6 — Heartbeat, suivi de lecture, règle RM-03 et tableau de bord apprenant
pnpm --filter @opensio/api exec tsx test/demo-lot6.ts

# Démo Lot 7 — Ateliers pratiques (Labs), éditeur, indices pénalisés et runner de validation
pnpm --filter @opensio/api exec tsx test/demo-lot7.ts

# Démo Lot 8 — Terminal virtuel whitelisté, Mentor IA Socratique, mode libre et isolation
pnpm --filter @opensio/api exec tsx test/demo-lot8.ts
```

---

## 🔐 Sécurité & Qualité de code

- **Mots de passe** : Hachage Argon2id sécurisé ($m=64\text{ Mio}, t=3, p=4$).
- **Gestion des sessions (D-09)** : Access Token JWT stocké en mémoire vive uniquement. Refresh token opaque 256 bits en cookie `HttpOnly; SameSite=Lax` avec rotation et détection de vol de jeton (révocation immédiate de la chaîne).
- **Zéro fuite de correction** : Les réponses correctes de quiz et scripts de validation de labs ne sont jamais exposés au client.
- **Terminal sécurisé** : Interpréteur avec liste blanche stricte de commandes (`ls`, `cat`, `ip`, `ping`, etc.) ; aucune exécution arbitraire de commande (`eval`/`exec`/`spawn`).
- **Garde-fous IA (RM-11)** : Filtre post-traitement interdisant le spoil de solutions évaluées et détection de contournement côté serveur.
- **Règle D-13 / RM-13** : Aucun fichier source ne dépasse 400 lignes dans l'ensemble du monorepo (vérifié à chaque commit et en CI).
- **Couverture de tests** : 235 tests automatisés (unitaires, intégration, E2E et frontend).

---

## 📚 En savoir plus

- 🗺️ **[Feuille de route & Jalons futurs](docs/roadmap.md)** : Bilan du MVP v0.1.0, prévisions v0.2 (Homelab, BYOK IA, runner Docker) et v1.0 (Proxmox VE, noVNC).
- ✍️ **[Guide de rédaction de contenu SISR](docs/content-guide.md)** : Guide exhaustif pour créer de nouveaux cours, quiz et ateliers pratiques conformes aux schémas Zod.
- 📓 **[Journal de bord du projet](docs/journal.md)** : Historique chronologique détaillé de chaque lot et arbitrages techniques.

---

## 📄 Licence

Distribué sous licence **MIT** — voir le fichier [LICENSE](LICENSE) pour plus de détails.
