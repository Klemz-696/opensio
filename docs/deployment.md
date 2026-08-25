# Guide de Déploiement et d'Exploitation — OpenSIO

Ce document décrit l'architecture de déploiement, les scénarios d'installation, la gestion de l'infrastructure et la sécurité de la plateforme OpenSIO sur environnement Linux (Debian 12/13, Ubuntu 22.04+, Proxmox VE, Homelab ou serveur dédié).

---

## 1. Matrice de Décision et Dimensionnement Matériel

Le tableau ci-dessous synthétise les quatre scénarios de déploiement supportés par l'installeur OpenSIO ainsi que leurs exigences matérielles respectives :

| Scénario | Infrastructure | Emplacement Ollama | RAM Minimale | RAM Recommandée | Stockage | Usage Cible |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Stack Seule (Sans IA)** | VM ou LXC Debian 12 | Désactivé (`AI_ENABLED=false`) | 1 Go | 2 Go | 20 Go | Serveur léger, contraintes de ressources |
| **2. Nœud IA Distant** | VM/LXC + Machine Dédiée | Serveur distant (`setup-ollama-node.sh`) | 2 Go (Stack) + 8 Go (IA) | 4 Go + 16 Go | 20 Go + 30 Go | Homelab multi-machines, GPU dédié |
| **3. Tout-en-un Conteneurisé** | VM ou LXC Debian 12 | Conteneur Docker (`--profile ai`) | 8 Go | 12–16 Go | 40–50 Go | Serveur unique sans configuration hôte |
| **4. Tout-en-un Hôte Linux** | VM ou Machine Physique | Hôte natif (`ollama serve`) | 8 Go | 12–16 Go | 40–50 Go | Machine Linux avec GPU direct (NVIDIA/AMD) |

---

## 2. Déploiement via le Wizard d'Installation

OpenSIO dispose d'un installeur universel interactif structuré en 3 phases séquentielles :
1. **Phase 1 — Analyse de l'environnement** : Détection du système d'exploitation, contrôle des versions des prérequis (Docker >= 24.0, Compose >= 2.20, Git >= 2.30), analyse des ressources matérielles (RAM, vCPU, disque) et vérification de la disponibilité des ports réseau.
2. **Phase 2 — Configuration interactive** : Choix du mode d'exécution, de l'emplacement de l'assistant IA, du nom de domaine, des ports d'écoute, de la politique de génération des secrets et du niveau de seed.
3. **Phase 3 — Exécution en une passe** : Enchaînement autonome du clonage/mise à jour, de la génération du fichier `.env`, du démarrage des conteneurs, de l'attente des vérifications de santé (healthchecks), de l'exécution des migrations de base de données et de l'amorçage initial.

### 2.1 Commande d'installation universelle

```bash
curl -fsSL https://raw.githubusercontent.com/Klemz-696/opensio/main/scripts/install.sh | bash
```

Pour une exécution locale depuis un dépôt déjà cloné :

```bash
./scripts/install.sh
```

### 2.2 Mode Simulation (--dry-run)

Le drapeau `--dry-run` (ou `-d`) permet de visualiser l'intégralité des actions, commandes et configurations qui seraient appliquées sans modifier le système :

```bash
./scripts/install.sh --dry-run
```

### 2.3 Mode Non Interactif et Automatisation (CI/CD / Provisioning)

L'installeur peut être exécuté de façon totalement automatisée en définissant `OPENSIO_NONINTERACTIVE=1` (ou avec l'option `-y` / `--non-interactive`) conjointement avec les variables d'environnement suivantes :

| Variable | Valeurs Possibles | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `OPENSIO_MODE` | `dev`, `prod` | `prod` | Mode d'exécution de la plateforme |
| `OPENSIO_AI_MODE` | `1` (hôte), `2` (conteneur), `3` (distant), `4` (sans IA) | `1` | Mode d'intégration du moteur LLM Ollama |
| `OPENSIO_AI_URL` | URL HTTP (ex. `http://192.168.1.50:11434/v1`) | Automatique | URL de l'API Ollama (si mode distant) |
| `OPENSIO_AI_MODEL` | Nom du modèle (ex. `llama3.1:8b`) | `llama3.1:8b` | Modèle de langage utilisé pour le mentor IA |
| `OPENSIO_DOMAIN` | Nom d'hôte ou FQDN | `opensio.home.lan` | Domaine principal servi par le reverse proxy Caddy |
| `OPENSIO_TLS_TYPE` | `internal`, `public` | `internal` | Type de certificat TLS émis par Caddy |
| `OPENSIO_HTTP_PORT` | Numéro de port | `80` | Port d'écoute HTTP public |
| `OPENSIO_HTTPS_PORT` | Numéro de port | `443` | Port d'écoute HTTPS public |
| `OPENSIO_DB_PASSWORD` | Chaîne ou `auto` | `auto` | Mot de passe du compte PostgreSQL `opensio` |
| `OPENSIO_SEED` | `complet`, `minimal`, `aucun` | `complet` | Niveau de données initiales injectées |

Exemple de déploiement automatisé :

```bash
OPENSIO_NONINTERACTIVE=1 \
OPENSIO_MODE=prod \
OPENSIO_DOMAIN=opensio.domaine.fr \
OPENSIO_TLS_TYPE=public \
OPENSIO_AI_MODE=4 \
OPENSIO_SEED=minimal \
./scripts/install.sh
```

---

## 3. Configuration des Scénarios de Déploiement

### Scénario 1 — Déploiement Léger sans IA
Ce mode est adapté aux machines disposant de 1 à 2 Go de mémoire RAM. L'assistant IA est désactivé (`AI_ENABLED=false`). L'API backend active automatiquement son mécanisme de dégradation gracieuse en masquant les fonctionnalités de mentorat sans altérer les modules de cours, quiz ou labs.

### Scénario 2 — Nœud IA Dédié Distant (Script setup-ollama-node.sh)
Lorsque l'inférence LLM est déportée sur une machine physique disposant de ressources GPU ou d'une quantité importante de RAM, utilisez le script `setup-ollama-node.sh` sur le serveur dédié :

```bash
sudo ./scripts/setup-ollama-node.sh --model llama3.1:8b --subnet 192.168.1.0/24
```

Ce script réalise les opérations suivantes :
1. Installation d'Ollama sur la machine distante.
2. Configuration de l'override systemd `Environment="OLLAMA_HOST=0.0.0.0"` dans `/etc/systemd/system/ollama.service.d/override.conf`.
3. Rechargement du démon systemd et redémarrage du service `ollama`.
4. Téléchargement du modèle demandé (`llama3.1:8b`).
5. Configuration du pare-feu UFW pour restreindre l'accès au port 11434 uniquement aux adresses IP du sous-réseau local spécifié.

Rattachez ensuite le nœud lors de l'exécution de l'installeur OpenSIO sur le serveur principal en indiquant le choix `[3] Machine distante` et l'URL `http://<IP_NOEUD>:11434/v1`.

### Scénario 3 — Stack Tout-en-un Conteneurisée
La stack déploie le conteneur officiel `ollama/ollama:latest` via le profil Docker Compose `ai`. Les modèles sont persistés dans le volume Docker `ollama_models`.
Commande de démarrage associée :

```bash
docker compose -f docker-compose.prod.yml --profile ai up -d --build
```

### Scénario 4 — Tout-en-un Hôte Linux
Ollama est installé directement sur le système d'exploitation hôte. Le conteneur `api` communique avec l'hôte via la directive réseau `extra_hosts: ["host.docker.internal:host-gateway"]` configurée dans `docker-compose.prod.yml`. L'URL d'API est configurée à `http://host.docker.internal:11434/v1`.

---

## 4. Sécurité de l'Infrastructure et Bonnes Pratiques

### 4.1 Sécurité du Service Ollama
Ollama ne comporte nativement aucun système d'authentification ou de contrôle d'accès par jeton.
- **Règle absolue** : Ne jamais exposer le port 11434 directement sur Internet ou sur un réseau non maîtrisé.
- **Isolation pare-feu** : En cas d'écoute sur `0.0.0.0`, l'accès au port 11434 doit être strictement restreint par pare-feu (UFW, nftables ou règles de groupe de sécurité réseau) aux seules adresses IP de la stack OpenSIO.

### 4.2 Certificats TLS et Reverse Proxy Caddy
Caddy gère automatiquement le chiffrement des flux HTTPS :
- **Mode Local / Homelab (`tls internal`)** : Caddy génère un certificat TLS émis par son autorité racine interne. Pour éviter les avertissements dans les navigateurs clients, exportez le certificat racine et importez-le dans les magasins de confiance des postes :
  ```bash
  docker compose -f docker-compose.prod.yml cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
  ```
- **Mode Public (`tls public`)** : Caddy sollicite automatiquement un certificat Let's Encrypt / ZeroSSL sous réserve que les ports 80 et 443 soient routés vers le serveur et que le nom de domaine pointe vers l'adresse IP publique.

### 4.3 Gestion des Secrets et Mots de Passe
- Le fichier `.env` est généré avec des clés cryptographiques de 64 octets minimum (`JWT_SECRET`, `BACKUP_ENCRYPTION_KEY`).
- Le mot de passe PostgreSQL est généré aléatoirement par défaut ou défini lors de la phase 2.
- La base de données PostgreSQL fonctionne sur le réseau Docker interne isolé `backend` sans port exposé sur l'hôte.

---

## 5. Exploitation et Maintenance

### Procédure de mise à jour
```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec -T api pnpm exec prisma migrate deploy
docker compose -f docker-compose.prod.yml exec -T api node dist/sync/cli.js
```

### Consultation des journaux
```bash
# Tous les services
docker compose -f docker-compose.prod.yml logs -f

# Service API NestJS
docker compose -f docker-compose.prod.yml logs -f api

# Service Web Next.js
docker compose -f docker-compose.prod.yml logs -f web
```

### Sauvegardes et Restauration
- Les sauvegardes quotidiennes chiffrées sont exécutées automatiquement chaque nuit à 2h00 par le service `backup`.
- Déclenchement d'une sauvegarde manuelle :
  ```bash
  docker compose -f docker-compose.prod.yml exec backup /scripts/backup.sh
  ```
- Pour la procédure de restauration complète, consultez le runbook `docs/runbooks/restore.md`.
