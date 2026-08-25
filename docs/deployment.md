# Guide de Déploiement Homelab & Proxmox VE — OpenSIO

Ce document décrit le déploiement de production d'OpenSIO sur une infrastructure personnelle (Homelab, Proxmox VE, Debian 12).

---

## 1. Dimensionnement Recommandé (Hôte 16 Go RAM / 500 Go)

Conformément à la décision **H1** du Blueprint OpenSIO, les ressources allouées à la VM/LXC de la plateforme sont optimisées :

| Ressource | Minimum | Recommandé |
|-----------|---------|------------|
| **Type** | Conteneur LXC Debian 12 ou VM KVM | Conteneur LXC Debian 12 (non-privilégié avec nesting) |
| **vCPU** | 2 cœurs | 2–4 cœurs |
| **RAM** | 4 Go | 4 Go |
| **Stockage** | 30 Go | 40–50 Go (SSD / NVMe) |
| **Réseau** | Bridge local `vmbr0` (LAN) | IP statique ou bail DHCP réservé |

---

## 2. Préparation de la Machine Debian 12

### Étape 2.1 — Création du conteneur LXC sous Proxmox VE
1. Dans l'interface Proxmox VE, cliquez sur **Create CT**.
2. Modèle : `debian-12-standard`.
3. Cochez **Nesting** dans `Options > Features` (indispensable pour exécuter Docker dans un conteneur LXC).
4. Allouez 2 vCPU, 4 Go de RAM et 40 Go de disque.

### Étape 2.2 — Installation de Docker & Utilitaires de base
Connectez-vous en SSH ou via la console Proxmox :

```bash
# Mise à jour système
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl git ca-certificates gnupg

# Installation du dépôt officiel Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

---

## 3. Déploiement via l'Installeur Une-Commande

Exécutez l'installeur interactif :

```bash
curl -fsSL https://raw.githubusercontent.com/Klemz-696/opensio/main/scripts/install.sh | bash
```

1. Sélectionnez l'option `[2] Mode Production`.
2. Choisissez si vous souhaitez inclure les comptes de démo (`admin@opensio.local` et `lucas.moreau@bts-sio.local`).
3. Indiquez votre nom de domaine local (par défaut : `opensio.home.lan`).

---

## 4. Configuration Réseau & Nom de Domaine (`opensio.home.lan`)

### Étape 4.1 — Résolution DNS locale
Pour accéder à `https://opensio.home.lan` depuis les postes de votre réseau local, configurez un enregistrement DNS `A` :
- **Sur votre routeur / box / Pi-hole / AdGuard Home** : créez une entrée DNS pointant `opensio.home.lan` vers l'adresse IP de votre serveur Debian.
- **À défaut (test sur un poste client unique)** : ajoutez la ligne suivante dans le fichier hosts de votre machine :
  - Windows : `C:\Windows\System32\drivers\etc\hosts`
  - Linux / macOS : `/etc/hosts`
  ```text
  192.168.1.50   opensio.home.lan
  ```

### Étape 4.2 — Approbation du Certificat TLS Interne Caddy (D-17)
Caddy génère automatiquement un certificat TLS sécurisé émis par son autorité racine interne.

Pour éviter les avertissements de sécurité du navigateur :
1. Récupérez le certificat racine Caddy depuis le volume Docker :
   ```bash
   docker compose -f docker-compose.prod.yml cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
   ```
2. Installez ce certificat dans le magasin de confiance de vos postes clients :
   - **Windows** : Double-cliquez sur `caddy-root.crt` > *Installer un certificat* > *Ordinateur local* > *Placer dans le magasin : Autorités de certification racines de confiance*.
   - **Linux** : Copiez dans `/usr/local/share/ca-certificates/caddy-root.crt` et exécutez `sudo update-ca-certificates`.
   - **Navigateurs (Firefox)** : Importez dans `Paramètres > Confidentialité et sécurité > Certificats > Afficher les certificats > Autorités > Importer`.

---

## 5. Exploitation & Maintenance

### Mises à jour
Pour mettre à jour la plateforme sans interruption de service :

```bash
cd /opt/opensio   # ou votre dossier de déploiement
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api pnpm exec prisma migrate deploy
docker compose -f docker-compose.prod.yml exec api node dist/sync/cli.js
```

### Consultation des journaux (Logs)
```bash
# Logs de l'ensemble des services
docker compose -f docker-compose.prod.yml logs -f

# Logs de l'API seule
docker compose -f docker-compose.prod.yml logs -f api
```

### Sauvegardes & Restauration
- Les sauvegardes chiffrées sont exécutées automatiquement chaque nuit à 2h00 dans le volume `backups_data`.
- Pour déclencher une sauvegarde manuelle :
  ```bash
  docker compose -f docker-compose.prod.yml exec backup /scripts/backup.sh
  ```
- Pour la procédure de restauration, consultez le runbook [`docs/runbooks/restore.md`](./runbooks/restore.md).
