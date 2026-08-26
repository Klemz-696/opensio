# OpenSIO

[![CI](https://github.com/Klemz-696/opensio/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Klemz-696/opensio/actions/workflows/ci.yml)

**Plateforme web d'apprentissage pour le BTS SIO option SISR** — cours structurés, quiz d'auto-évaluation, ateliers pratiques guidés et mentor IA, le tout auto-hébergeable.

OpenSIO transforme le référentiel du BTS SIO SISR en parcours interactifs : chaque module combine des leçons rédigées en Markdown, des quiz corrigés et des labs balisés étape par étape, avec une progression suivie de bout en bout.

---

## Fonctionnalités

### Apprentissage
- **Catalogue par année de formation** (tracks 1ère / 2ème année), modules ordonnés avec jauges de progression
- **Leçons en Markdown** enrichies : coloration syntaxique Shiki bi-thème, blocs de code copiables, métadonnées pédagogiques (objectifs, prérequis, durée)
- **Navigation de cours complète** : boutons précédent/suivant, raccourcis clavier, sommaire de module repliable, reprise de leçon sur le tableau de bord

### Évaluation
- **Quiz pas-à-pas** : stepper de questions, écran de révision avant soumission, correction détaillée avec explications, idempotence anti-double-soumission
- **Labs guidés** : checklist interactive persistante, terminal simulé, indices à pénalité de score, verdict détaillé contrôle par contrôle

### Mentor IA
- **Assistant contextuel** (LLM local via Ollama) qui connaît la leçon, le lab ou le quiz en cours
- **Règle socratique** : il guide sans jamais donner les solutions, avec filtrage anti-contournement
- Conversations multiples, archivage, titres automatiques, mode libre configurable

### Comptes & administration
- **Authentification JWT** complète (rotation des refresh tokens, détection de réutilisation)
- **RBAC** : rôles administrateur / apprenant, console `/admin/users` (création, édition, désactivation, réinitialisation)
- Mots de passe temporaires avec **changement forcé** à la première connexion
- **Profil utilisateur** : avatar (upload validé), biographie, préférences, changement de mot de passe
- **Conformité RGPD** : suppression de compte avec effacement des données et fichiers associés

### Interface
- **Thème clair / sombre / système** sans flash au chargement, palette soignée dans les deux modes
- Design responsive (mobile, tablette, desktop), composants shadcn/ui

---

## Stack technique

| Couche | Technologies |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 4, shadcn/ui, next-themes |
| Backend | NestJS 11, Prisma 6, PostgreSQL 16, Redis 7 |
| IA | Ollama (API compatible OpenAI), modèle local `llama3.1:8b` |
| Contenu | Markdown + YAML, validé par schéma Zod (`@opensio/content-schema`) |
| Qualité | Vitest (350+ tests), ESLint, Turborepo, GitHub Actions |
| Infra | Docker Compose (dev & prod), scripts de sauvegarde, runbooks |

---

## État du projet

Le socle est **terminé et validé par la CI** : authentification, RBAC, administration, profils, mentor IA, moteur de quiz et de labs, thème bi-mode.

Contenu actuel — **track 1ère année** :

| Module | Leçons | Labs |
|---|---|---|
| Réseaux : fondamentaux | 7 (IPv4, OSI/TCP-IP, VLSM, IPv6, VLAN, routage, DNS/DHCP) | 4 |
| Windows Server & Active Directory | 6 (rôles, AD DS, UO, GPO, DNS/DHCP, NTFS) | 3 |

Qualité : 350+ tests automatisés, lint / typecheck / build verts, règle D-13 (taille des fichiers), contrôle des classes bi-thème, protection de branche avec checks obligatoires sur `main`.

## Trajectoire

1. **Contenu (en cours)** — compléter le référentiel SISR : track 2ème année, modules Linux, virtualisation, sécurité, supervision, scripting, SQL, GLPI, anglais technique
2. **Homelab** — runner Proxmox VE pour exécuter les labs sur de vraies VMs au-delà de la simulation
3. **Production** — déploiement auto-hébergé via `docker-compose.prod.yml`

La feuille de route détaillée et l'historique des lots sont dans [`docs/roadmap.md`](docs/roadmap.md) et [`docs/journal.md`](docs/journal.md).

---

## Démarrage rapide

Prérequis : Node.js 22, pnpm 10, Docker Desktop.

```bash
git clone https://github.com/Klemz-696/opensio.git
cd opensio
pnpm install

# Base PostgreSQL + Redis (Docker)
docker compose -p opensio -f infra/docker/docker-compose.dev.yml up -d db redis

# Configuration
cp .env.example apps/api/.env   # renseigner JWT_SECRET, SEED_ADMIN_*, etc.

# Base de données
pnpm --filter @opensio/api exec prisma migrate deploy
pnpm --filter @opensio/api exec prisma generate
pnpm --filter @opensio/api exec prisma db seed

# Lancement
pnpm dev
```

- Site : http://localhost:3000
- API : http://localhost:4000/api/v1
- Compte administrateur : créé par le seed via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (politique de mot de passe validée au seed)
- Compte démo : uniquement si `DEMO_SEED=true`

`pnpm doctor` vérifie l'ensemble des prérequis (Docker, base, Redis, Ollama).

## Scripts utiles

| Commande | Rôle |
|---|---|
| `pnpm dev` | Lance l'API et le front en mode développement |
| `pnpm test` | Suite complète de tests (API, web, schéma de contenu) |
| `pnpm lint` / `pnpm typecheck` | Qualité statique |
| `pnpm check:theme` | Garde-fou classes bi-thème (clair/sombre) |
| `node scripts/check-file-size.mjs` | Règle D-13 (400 lignes max par fichier) |
| `bash scripts/backup-db.sh` | Sauvegarde PostgreSQL datée et compressée |

## Documentation

- [`docs/installation.md`](docs/installation.md) — guide d'installation détaillé
- [`docs/deployment.md`](docs/deployment.md) — déploiement production
- [`docs/content-guide.md`](docs/content-guide.md) — écrire modules, leçons, quiz et labs
- [`docs/runbooks/`](docs/runbooks/) — procédures d'exploitation
- [`OpenSIO-Project-Blueprint.md`](OpenSIO-Project-Blueprint.md) — vision et architecture du projet

## Licence

Voir [LICENSE](LICENSE).
