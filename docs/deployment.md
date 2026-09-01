# Déploiement d'OpenSIO en Production (Lot B11)

Ce document décrit pas à pas comment déployer OpenSIO sur un homelab Proxmox VE (Debian 12).
L'architecture Docker Compose intègre l'API, le Web, PostgreSQL, Caddy (HTTPS) et Ollama.

## Prérequis communs
- Un hôte Proxmox VE disposant des ressources suffisantes.
- Le nom de domaine choisi configuré (si vous n'utilisez pas `localhost`).
- Une connexion SSH à l'hôte cible.

## Option A — Machine Virtuelle Debian 12 (Recommandée)

C'est la solution la plus robuste pour isoler l'environnement Docker.

**Ressources minimales :**
- 2 vCPU
- 4 Go RAM (ajoutez 8 Go si vous hébergez Ollama localement)
- 40 Go disque

### 1. Installation de Docker
```bash
# Mise à jour système
sudo apt update && sudo apt upgrade -y

# Installation de Docker (script officiel)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```
*(Déconnectez-vous puis reconnectez-vous pour appliquer le groupe docker).*

### 2. Déploiement de l'application
```bash
# Clonez le dépôt (remplacez par votre URL)
git clone https://github.com/Klemz-696/opensio.git
cd opensio

# Générez la configuration de production
node scripts/generate-secrets.mjs

# (Optionnel) Modifiez .env.production si vous avez un vrai domaine
# nano .env.production

# Démarrez la stack
docker compose -f infra/docker/docker-compose.prod.yml up -d
```

### 3. Vérification
```bash
docker compose -f infra/docker/docker-compose.prod.yml ps
```
Vérifiez que tous les conteneurs sont "Up" et "healthy". Accédez à votre domaine ou IP : le HTTPS est géré automatiquement.

---

## Option B — Conteneur LXC (Alternative légère)

Le déploiement en LXC est possible mais nécessite une configuration spécifique de Proxmox.

**Limites :**
- L'assignation de GPU (passthrough) pour Ollama est plus complexe qu'en VM.

### 1. Création du LXC sur Proxmox
- Téléchargez le template `debian-12-standard`.
- Créez le LXC (décochez "Unprivileged" si vous rencontrez des problèmes de permissions de volumes, mais il est recommandé d'essayer en unprivileged d'abord).
- **CRITIQUE :** Dans "Features" (Options du LXC), cochez **Nesting** et **keyctl**. Ces options sont obligatoires pour faire tourner Docker dans un LXC.

### 2. Installation et déploiement
Connectez-vous au LXC et suivez **exactement les mêmes étapes** 1, 2 et 3 que pour l'Option A.

---

## Ollama : Configuration du Chatbot

OpenSIO intègre 3 modes pour Ollama, paramétrables dans `.env.production` :

| Mode | Configuration | Cas d'usage |
|------|---------------|-------------|
| **Désactivé** | `AI_ENABLED=false` | Pas de mentorat IA (l'interface s'adapte). |
| **Local** | `OLLAMA_BASE_URL=http://ollama:11434`<br/>Lancer avec : `docker compose -f ... --profile ollama-local up -d` | Ollama tourne sur la même machine. RAM requise : +8 Go minimum. |
| **Distant** | `OLLAMA_BASE_URL=http://<IP-SERVEUR>:11434` | Ollama tourne sur un autre serveur GPU (recommandé pour les performances). |

---

## Opérations courantes

### Mises à jour
```bash
cd opensio
git pull origin main
# Rebuild des images
docker compose -f infra/docker/docker-compose.prod.yml build
# Redémarrage
docker compose -f infra/docker/docker-compose.prod.yml up -d
```

### Sauvegardes
Intégrez le script de sauvegarde existant au cron de la machine hôte :
```bash
# Exemple : sauvegarde tous les jours à 3h du matin
0 3 * * * cd /chemin/vers/opensio && ./scripts/backup.sh
```

### Dépannage
- **Caddy ne génère pas de certificat HTTPS :** Assurez-vous que les ports 80 et 443 sont bien redirigés vers la VM/LXC (NAT) et que le domaine pointe bien vers votre IP publique.
- **Le terminal affiche "Erreur réseau" :** Vérifiez les logs avec `docker compose -f infra/docker/docker-compose.prod.yml logs api`.
