# Guide d'Installation — OpenSIO

Ce guide détaille l'installation d'OpenSIO sur votre machine de développement ou sur un serveur.

---

## ⚡ Installation Rapide en Une Commande

OpenSIO propose des installeurs interactifs automatisés qui vérifient les prérequis système, configurent l'environnement et démarrent les services.

### 🪟 Windows (PowerShell)

Ouvrez un terminal PowerShell (en administrateur si des outils doivent être installés) et exécutez :

```powershell
iex (irm https://raw.githubusercontent.com/Klemz-696/opensio/main/scripts/install.ps1)
```

> **Options disponibles** :
> - Spécifier le dossier : l'installeur vous demandera où installer le projet (défaut : `~\opensio`). Vous pouvez aussi passer `-InstallDir <chemin>`.
> - Mode diagnostic sans modification : `-DryRun` affiche l'état de chaque prérequis sans rien installer.

### 🐧 Linux & 🍎 macOS (Bash / Zsh)

Ouvrez un terminal :

```bash
bash <(curl -s https://raw.githubusercontent.com/Klemz-696/opensio/main/scripts/install.sh)
```

> **Options disponibles** :
> - Spécifier le dossier : passer `--dir <chemin>` (défaut : `~/opensio`).
> - Mode diagnostic : `--dry-run`.
> - **Note technique** : L'installeur bash redirige son entrée interactive sur `/dev/tty` afin de rester 100 % interactif.

---

## 📋 Prérequis Système

| Composant | Version minimale | Rôle | Activation / Installation |
|-----------|------------------|------|---------------------------|
| **Node.js** | ≥ 22.0.0 (LTS) | Runtime d'exécution JavaScript / TypeScript | `winget install OpenJS.NodeJS.LTS` ou [nodejs.org](https://nodejs.org) |
| **pnpm** | ≥ 9 (idéalement 10+) | Gestionnaire de paquets du monorepo | `corepack enable && corepack prepare pnpm@10 --activate` |
| **Git** | ≥ 2.30 | Gestion de versions et clonage du code | `winget install Git.Git` ou [git-scm.com](https://git-scm.com) |
| **Docker** | ≥ 24.0 (démon actif) | Conteneurisation de PostgreSQL et de la stack | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| **Ollama** *(optionnel)* | Dernière version | Assistant pédagogique local (Mentor IA) | Proposition de `ollama pull llama3.1:8b` |

---

## 🔧 Installation Manuelle (Alternative)

Si vous préférez cloner et orchestrer le projet vous-même :

```bash
# 1. Préparer pnpm via Corepack (fourni avec Node.js >= 16.13)
corepack enable
corepack prepare pnpm@10 --activate

# 2. Cloner le dépôt et entrer dans le dossier
git clone https://github.com/Klemz-696/opensio.git
cd opensio

# 3. Installer les dépendances
pnpm install

# 4. Lancer le gestionnaire intelligent OpenSIO
pnpm opensio
```

---

## 🎮 Options du Menu Interactif

Lors du lancement d'OpenSIO (`pnpm opensio`), plusieurs choix vous sont proposés :

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
   - Lance la stack de développement.

2. **[2] Mode Production** :
   - Construit les images Docker durcies multi-stage non-root (`opensio/web`, `opensio/api`, `opensio/backup`).
   - Démarre le reverse proxy Caddy avec HTTPS automatique pour votre domaine.
   - Isole la base de données PostgreSQL 18 sur un réseau Docker interne non publié.
   - Configure les sauvegardes quotidiennes chiffrées automatiques (D-18).

---

## 🔧 Dépannage & Cas Particuliers

### 1. Politique d'Exécution PowerShell (Windows)
Si l'exécution de scripts est bloquée avec l'erreur `PSSecurityException` ou `Execution_Policies` :
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
Puis relancez la commande d'installation.

### 2. Démon Docker Injoignable ou Non Démarré
Si l'installeur indique que Docker ne répond pas :
- **Windows** : Démarrez **Docker Desktop**, vérifiez que l'icône dans la zone de notification devient verte (« Docker Desktop is running ») et testez dans un terminal avec :
  ```powershell
  docker info
  ```
- **Linux** : Lancez le service système :
  ```bash
  sudo systemctl start docker
  sudo usermod -aG docker $USER
  ```

### 3. Commande `pnpm` Introuvable après Installation
Après activation ou installation de `pnpm`, la variable d'environnement `PATH` de votre terminal en cours peut ne pas être actualisée :
1. Fermez toutes vos fenêtres de terminal et rouvrez un terminal frais.
2. Si `pnpm` reste introuvable, activez-le manuellement avec Corepack :
   ```powershell
   corepack enable
   corepack prepare pnpm@10 --activate
   ```
   Ou alternativement via npm :
   ```powershell
   npm install -g pnpm
   ```

### 4. Mode Diagnostic Prérequis (-DryRun)
Pour diagnostiquer l'état exact des prérequis sans modifier votre machine :
```powershell
# Windows
powershell -ExecutionPolicy Bypass -File scripts\install.ps1 -DryRun

# macOS / Linux
bash scripts/install.sh --dry-run
```

### 5. Conflit de Port (5432, 3000, 4000, 80, 443)
Si un port est déjà occupé sur votre machine :
- **Mode Dev** : Modifiez `ports` dans `infra/docker/docker-compose.dev.yml` ou `API_PORT` dans `.env`.
- **Mode Prod** : Modifiez les ports exposés par Caddy dans `docker-compose.prod.yml`.

### 6. Ollama sous Windows (Résolution IPv4 vs IPv6)
Sous Windows, Node.js résout parfois `localhost` vers `::1` (IPv6). Si Ollama n'écoute que sur IPv4 (`127.0.0.1`), configurez `AI_BASE_URL=http://127.0.0.1:11434/v1` dans votre `.env`.

### 7. Manque de RAM pour le Modèle IA
Le modèle `llama3.1:8b` requiert environ 5 Go de mémoire RAM disponible. Si votre PC dispose de moins de 16 Go de RAM :
- Téléchargez un modèle plus léger comme `ollama pull llama3.2:3b` ou `qwen2.5-coder:7b`.
- Renseignez `AI_MODEL=llama3.2:3b` dans votre `.env`.
