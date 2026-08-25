# Guide d'Installation — OpenSIO

Ce guide détaille l'installation d'OpenSIO sur votre machine de développement ou sur un serveur.

---

## ⚡ Installation Rapide en Une Commande

OpenSIO propose des installeurs interactifs automatisés qui vérifient les prérequis système, configurent l'environnement et démarrent les services.

### 🪟 Windows (PowerShell)

Ouvrez un terminal PowerShell (en administrateur si des outils doivent être installés) :

```powershell
irm https://raw.githubusercontent.com/Klemz-696/opensio/main/scripts/install.ps1 | iex
```

### 🐧 Linux & 🍎 macOS (Bash / Zsh)

Ouvrez un terminal :

```bash
curl -fsSL https://raw.githubusercontent.com/Klemz-696/opensio/main/scripts/install.sh | bash
```

> **Note technique** : L'installeur bash redirige son entrée interactive sur `/dev/tty` afin de rester 100 % interactif même lorsqu'il est exécuté via un pipe `curl | bash`.

---

## 📋 Prérequis Système

| Composant | Version minimale | Rôle | Installation assistée |
|-----------|------------------|------|-----------------------|
| **Git** | ≥ 2.30 | Gestion de versions et clonage du code | `winget` (Windows) / `apt`/`dnf`/`brew` (Linux/mac) |
| **Node.js** | ≥ 22.0.0 | Runtime d'exécution JavaScript / TypeScript | `winget` / `apt` / `brew` |
| **pnpm** | ≥ 9 (idéalement 11) | Gestionnaire de paquets du monorepo | `corepack enable` ou `npm i -g pnpm` |
| **Docker** | ≥ 24.0 (démon actif) | Conteneurisation de PostgreSQL et de la stack | Docker Desktop / Docker Engine |
| **Ollama** *(optionnel)* | Dernière version | Assistant pédagogique local (Mentor IA) | Proposition de `ollama pull llama3.1:8b` |

---

## 🎮 Options du Menu Interactif

Lors du lancement de l'installeur, plusieurs choix vous sont proposés :

```text
Choisissez le mode d'installation :
  [1] Mode Développement (PC local — BDD Docker + apps Node.js)
  [2] Mode Production (Serveur / Homelab — Stack Docker durcie + Caddy HTTPS)
```

1. **[1] Mode Développement** :
   - Démarre PostgreSQL 18 Alpine dans Docker (`infra/docker/docker-compose.dev.yml`).
   - Installe les dépendances du monorepo via `pnpm install`.
   - Génère un secret fort `JWT_SECRET` (64 octets) dans `.env`.
   - Applique les migrations Prisma et synchronise le contenu pédagogique (`content/`).
   - Vous permet de lancer la stack avec `pnpm dev`.

2. **[2] Mode Production** :
   - Construit les images Docker durcies multi-stage non-root (`opensio/web`, `opensio/api`, `opensio/backup`).
   - Démarre le reverse proxy Caddy avec HTTPS automatique et autorité de certification interne pour votre domaine (défaut : `opensio.home.lan`).
   - Isole la base de données PostgreSQL 18 sur un réseau Docker interne non publié.
   - Configure les sauvegardes quotidiennes chiffrées automatiques (D-18).

3. **Options complémentaires** :
   - **Données de démonstration (Seed)** : Crée les comptes de test enseignant/étudiant avec des données de progression pré-remplies.
   - **Assistant IA (Mentor)** : Détecte Ollama et le modèle `llama3.1:8b`. Si Ollama est absent, le Mentor est désactivé proprement (`AI_ENABLED=false`) sans bloquer la plateforme.

---

## 🔧 Dépannage & Cas Particuliers

### 1. Conflit de Port (5432, 3000, 4000, 80, 443)
Si un port est déjà occupé sur votre machine :
- **Mode Dev** : Modifiez `ports` dans `infra/docker/docker-compose.dev.yml` ou `API_PORT` dans `.env`.
- **Mode Prod** : Modifiez les ports exposés par Caddy dans `docker-compose.prod.yml`.

### 2. Démon Docker Injoignable
- **Windows** : Assurez-vous que **Docker Desktop** est lancé et que l'intégration WSL 2 est activée.
- **Linux** : Lancez le service via `sudo systemctl start docker` et ajoutez votre utilisateur au groupe : `sudo usermod -aG docker $USER`.

### 3. Ollama sous Windows (Résolution IPv4 vs IPv6)
Sous Windows, Node.js 18+ résout parfois `localhost` vers `::1` (IPv6). Si Ollama n'écoute que sur IPv4 (`127.0.0.1`), configurez `AI_BASE_URL=http://127.0.0.1:11434/v1` dans votre `.env`.

### 4. Manque de RAM pour le Modèle IA
Le modèle `llama3.1:8b` requiert environ 5 Go de mémoire RAM disponible. Si votre PC dispose de moins de 16 Go de RAM :
- Téléchargez un modèle plus léger comme `ollama pull llama3.2:3b` ou `qwen2.5-coder:7b`.
- Renseignez `AI_MODEL=llama3.2:3b` dans votre `.env`.

### 5. Procédure de bascule PostgreSQL 16 → 18 en Développement Local
Pour aligner un environnement de développement existant sur PostgreSQL 18 Alpine (parité stricte avec la CI et la production) :
Les données de développement étant 100 % reproductibles (schéma Prisma, comptes de test hachés Argon2id et catalogue pédagogique Git), la bascule s'effectue en réinitialisant le volume local :

```bash
# 1. Arrêter et purger l'ancien conteneur / volume de dev (PG16)
docker compose -f infra/docker/docker-compose.dev.yml down -v

# 2. Démarrer le nouveau conteneur PostgreSQL 18
docker compose -f infra/docker/docker-compose.dev.yml up -d

# 3. Réappliquer les migrations, amorcer les comptes de test et synchroniser le contenu
pnpm db:migrate
pnpm seed
pnpm content:sync
```

