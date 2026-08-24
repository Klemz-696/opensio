# OpenSIO

> Plateforme auto-hébergée de formation et de révision pratique pour le BTS SIO option SISR.

Ce projet fournit une solution complète pour apprendre et réviser le référentiel SISR par la pratique : cours structurés en Markdown, quiz auto-corrigés, suivi de progression, labs interactifs et scénarios de diagnostic.

---

## 🛠 Stack Technique

- **Frontend** : Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend** : NestJS 11, TypeScript
- **Base de données** : PostgreSQL 16 (Prisma ORM au Lot 1)
- **Monorepo** : pnpm workspaces + Turborepo
- **Qualité & Tests** : ESLint 9, Vitest, Testing Library, vérificateur de conformité D-13

---

## 📋 Prérequis

- **Node.js** : `>= 22.0.0`
- **pnpm** : `>= 9.0.0` (version recommandée : `11.x`)
- **Docker & Docker Compose** : (Docker Desktop / Docker Engine)
- **Git**

---

## 🚀 Démarrage Rapide (Développement)

1. **Cloner le dépôt et installer les dépendances** :
   ```bash
   pnpm install
   ```

2. **Configurer l'environnement** :
   ```bash
   cp .env.example .env
   ```

3. **Démarrer les services d'infrastructure (PostgreSQL)** :
   ```bash
   docker compose -f infra/docker/docker-compose.dev.yml up -d
   ```

4. **Lancer les applications en mode développement** :
   ```bash
   pnpm dev
   ```
   - Frontend : [http://localhost:3000](http://localhost:3000)
   - API Backend : [http://localhost:4000/health](http://localhost:4000/health)

---

## 🧪 Commandes Disponibles

| Commande | Description |
|---|---|
| `pnpm dev` | Démarre toutes les applications en mode surveillance |
| `pnpm build` | Construit les applications et packages du monorepo |
| `pnpm lint` | Exécute ESLint sur tous les projets |
| `pnpm typecheck` | Vérifie la cohérence des types TypeScript |
| `pnpm test` | Exécute les suites de tests unitaires et d'intégration (Vitest) |
| `pnpm content:sync` | Synchronise le contenu Markdown/YAML dans PostgreSQL |
| `pnpm seed` | Amorce les comptes administrateur et étudiant de démonstration |
| `pnpm check-file-size` | Contrôle la conformité D-13 (aucun fichier source > 400 lignes) |

---

## 📐 Conventions de Code & Architecture

- **Règle D-13 / RM-13** : Aucun fichier source ne doit dépasser 400 lignes (cible 200–400 lignes). Tout fichier volumineux doit être découpé par responsabilité.
- **Blueprint contractuel** : Se référer à `OpenSIO-Project-Blueprint.md` pour l'ensemble des spécifications fonctionnelles, techniques et de sécurité.

---

## 📄 Licence

Ce projet est sous licence [MIT](LICENSE).
