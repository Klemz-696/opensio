---
slug: modeles-clones-lies-cloudinit
title: "Modèles (Templates), clones liés et automatisation du provisionnement avec Cloud-Init"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 50
objectives:
  - "Comprendre le rôle des modèles (VM Templates) pour standardiser les déploiements d'OS"
  - "Distinguer un clone intégral (Full Clone, indépendant) d'un clone lié (Linked Clone, instantané et économe)"
  - "Comprendre l'architecture de Cloud-Init et la structure des sections user-data, meta-data et network-config"
  - "Automatiser la création d'utilisateurs sudo, l'injection de clés SSH et l'installation de paquets via Cloud-Init"
  - "Créer un template Debian / Ubuntu Cloud-Image en ligne de commande avec qm"
prerequisites:
  - "architecture-proxmox-ve"
  - "linux-administration"
competency_refs:
  - "B1.1"
  - "B1.5"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Modèles, Clones Liés et Cloud-Init' avec au moins 80 %"
  - "Valider l'atelier 'Configuration d'une VM avec Cloud-Init'"
labs:
  - slug: configuration-cloudinit-vm
    required: true
references:
  - label: "Documentation Officielle Cloud-Init — User-data format"
    url: "https://cloudinit.readthedocs.io/en/latest/reference/examples.html"
  - label: "Proxmox VE — Cloud-Init Support"
    url: "https://pve.proxmox.com/pve-docs/chapter-qm.html#qm_cloud_init"
---

# Modèles, Clones Liés et Automatisation avec Cloud-Init

L'installation manuelle répétitive de systèmes d'exploitation via fichiers ISO traditionnels est lente et génère des erreurs de configuration. Dans une infrastructure moderne, le déploiement de machines virtuelles s'appuie sur des **images génériques (_Cloud Images_)**, des **modèles (_Templates_)** et le standard universel **Cloud-Init**.

---

## 1. Modèles de VMs et Stratégies de Clonage

Un **Modèle (_VM Template_)** est une machine virtuelle en lecture seule qui sert de matrice de référence pour créer de nouvelles instances.

```text
                               +---------------------------------+
                               |   Modèle (Template) VM ID 9000  |
                               |    Debian 12 Cloud-Image 2 Go   |
                               +----------------┬----------------+
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
+---------------------------------+                           +---------------------------------+
|     Clone Lié (Linked Clone)    |                           |    Clone Intégral (Full Clone)  |
+---------------------------------+                           +---------------------------------+
| - Démarrage instantané (< 5s)   |                           | - Copie intégrale bit à bit     |
| - Consomme ~100 Mo au départ    |                           | - Totalement autonome           |
| - Dépend du disque du Template  |                           | - Indépendant du Template       |
| - Idéal pour TPs et labs éphémères                          | - Idéal pour serveurs de prod   |
+---------------------------------+                           +---------------------------------+
```

---

## 2. Qu'est-ce que Cloud-Init ?

**Cloud-Init** est le standard multi-distributions (Debian, Ubuntu, RHEL, Rocky, Alma) pour la personnalisation automatique d'une machine virtuelle lors de son tout premier démarrage (_First Boot_).

À l'initialisation, Cloud-Init lit les métadonnées fournies par l'hyperviseur pour :
1. Définir le nom d'hôte (`hostname`) et le domaine DNS.
2. Créer les comptes utilisateurs locaux et injecter leurs clés publiques SSH.
3. Configurer les adresses IP statiques ou DHCP et les serveurs DNS.
4. Mettre à jour les dépôts et installer automatiquement des paquets applicatifs (`packages:`).
5. Exécuter des scripts personnalisés post-installation (`runcmd:`).

---

## 3. Structure du Fichier de Configuration `user-data`

Le fichier `user-data` est rédigé en syntaxe déclarative YAML. La première ligne doit impérativement comporter l'en-tête `#cloud-config` :

```yaml
#cloud-config

# 1. Définition du nom d'hôte de la machine
hostname: srv-web-prod
fqdn: srv-web-prod.entreprise.lan
manage_etc_hosts: true

# 2. Mise à jour des paquets au premier démarrage
package_update: true
package_upgrade: true

# 3. Création des comptes utilisateurs et injection de clés SSH
users:
  - name: debian
    gecos: Administrateur Système
    sudo: ALL=(ALL) NOPASSWD:ALL
    groups: sudo, adm
    shell: /bin/bash
    lock_passwd: false
    # Hash Yescrypt ou SHA-512 du mot de passe
    passwd: "$6$rounds=4096$salt$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG... admin@entreprise.lan

# 4. Paquets logiciels à installer immédiatement
packages:
  - qemu-guest-agent
  - curl
  - htop
  - git
  - ufw

# 5. Commandes système exécutées en fin de déploiement
runcmd:
  # Activer et démarrer l'agent QEMU pour le monitoring Proxmox
  - systemctl enable --now qemu-guest-agent
  # Durcir le pare-feu
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow 22/tcp
  - ufw --force enable
```

---

## 4. Création d'un Template Cloud-Init sous Proxmox (CLI)

```bash
# 1. Télécharger l'image Cloud officielle Debian 12
wget https://cloud.debian.org/images/cloud/bookworm/latest/debian-12-generic-amd64.qcow2

# 2. Créer une VM vierge (ID 9000)
qm create 9000 --name "tpl-debian12-cloud" --memory 2048 --cores 2 --net0 virtio,bridge=vmbr0

# 3. Importer le disque cloud dans le pool de stockage local-lvm
qm importdisk 9000 debian-12-generic-amd64.qcow2 local-lvm

# 4. Attacher le disque en tant que périphérique SCSI VirtIO avec TRIM
qm set 9000 --scsihw virtio-scsi-pci --scsi0 local-lvm:vm-9000-disk-0,discard=on,ssd=1

# 5. Configurer le lecteur de CD-ROM virtuel Cloud-Init
qm set 9000 --ide2 local-lvm:cloudinit

# 6. Définir l'ordre de démarrage sur le disque SCSI
qm set 9000 --boot c --bootdisk scsi0

# 7. Activer la console série et l'agent invité QEMU
qm set 9000 --serial0 socket --vga serial0 --agent 1

# 8. Convertir la VM en Modèle (Template immuable)
qm template 9000
```

---

## 5. Déploiement d'une Nouvelle VM depuis le Template

```bash
# Créer un clone lié (Linked Clone) instantané avec l'ID 110
qm clone 9000 110 --name "srv-bdd-01"

# Configurer les paramètres réseau et l'utilisateur via Cloud-Init
qm set 110 --ciuser admin --cipassword "MotDePasseFort!" --sshkeys ~/.ssh/id_ed25519.pub
qm set 110 --ipconfig0 ip=192.168.10.110/24,gw=192.168.10.254

# Démarrer la VM
qm start 110
```
La machine démarre en quelques secondes avec son adresse IP, son utilisateur `admin` configuré et sa clé SSH active sans aucune interaction manuelle !
