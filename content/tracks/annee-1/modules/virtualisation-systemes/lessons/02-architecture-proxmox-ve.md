---
slug: architecture-proxmox-ve
title: "Architecture de Proxmox VE : KVM, conteneurs LXC, stockage et outils d'administration"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 50
objectives:
  - "Comprendre l'architecture globale de Proxmox Virtual Environment (Debian 12 + KVM + LXC)"
  - "Distinguer les cas d'usage entre Machines Virtuelles KVM (isolation totale, tout OS) et Conteneurs LXC (densité, légèreté, noyau partagé)"
  - "Comprendre le système de fichiers de cluster distribué Proxmox Cluster File System (pmxcfs / Corosync)"
  - "Identifier les types de stockage supportés : bloc (LVM, LVM-Thin, ZFS, Ceph) vs fichier (Directory, NFS, SMB/CIFS)"
  - "Maîtriser les commandes CLI fondamentales d'administration qm (KVM), pct (LXC) et pvesm (Stockage)"
prerequisites:
  - "hyperviseurs-type1-type2"
competency_refs:
  - "B1.1"
  - "B1.5"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Architecture Proxmox VE' avec au moins 80 %"
labs: []
references:
  - label: "Documentation Officielle Proxmox VE — Administration Guide"
    url: "https://pve.proxmox.com/pve-docs/pve-admin-guide.html"
  - label: "Proxmox VE Reference Documentation — Storage Architecture"
    url: "https://pve.proxmox.com/pve-docs/chapter-pvesm.html"
---

# Architecture de Proxmox VE : KVM, Conteneurs LXC et Stockage

**Proxmox Virtual Environment (PVE)** est une plateforme d'hyperconvergence et de virtualisation open-source complète d'entreprise. Basée sur **Debian GNU/Linux 12 (Bookworm)**, elle intègre nativement deux technologies de virtualisation complémentaires dans une interface d'administration unifiée : **KVM** pour la virtualisation matérielle complète et **LXC** pour la conteneurisation système légère.

---

## 1. Vue d'Ensemble des Composants Internes

L'architecture de Proxmox VE repose sur des briques éprouvées du monde Linux :

```text
+-------------------------------------------------------------------------------+
|                      Interface d'Administration Proxmox                       |
|           [ Interface Web GUI HTTPS:8006 ]  /  [ API REST ]  /  [ CLI ]       |
+-------------------------------------------------------------------------------+
|        Moteur de Gestion & Cluster : pvedaemon, pveproxy, corosync            |
|        Système de Fichiers de Configuration Distribué : /etc/pve (pmxcfs)    |
+---------------------------------------+---------------------------------------+
|        Virtualisation Matérielle      |         Conteneurs Système            |
|        KVM / QEMU (Machines Virtuelles|         LXC (Linux Containers)        |
|        Windows, Linux, BSD, Routeurs) |         Services Debian, Ubuntu, etc. |
+---------------------------------------+---------------------------------------+
|                           Noyau Linux Durci PVE (Kernel 6.x)                  |
|          Pilotes VirtIO / Open vSwitch / Linux Bridges / ZFS / LVM / Ceph     |
+-------------------------------------------------------------------------------+
|                               Matériel Serveur Hôte                           |
+-------------------------------------------------------------------------------+
```

---

## 2. KVM vs Conteneurs LXC : Matrice Comparative

| Critère | Machine Virtuelle KVM | Conteneur Système LXC |
|---|---|---|
| **Niveau d'isolation** | Émulation matérielle complète (BIOS, CPU, RAM, NIC) | Isolation noyau par cgroups, namespaces et AppArmor |
| **Système invité** | **Tout système d'exploitation** (Windows Server, Linux, FreeBSD, pfSense, MikroTik) | **Distributions Linux uniquement** (partage le noyau Linux de l'hôte) |
| **Empreinte mémoire (RAM)** | Fixe et allouée dès le démarrage de la VM | Dynamique, consomme uniquement ce que les processus utilisent |
| **Temps de démarrage** | 15 à 45 secondes (séquence BIOS/UEFI + boot kernel) | **Quasi instantané (< 2 secondes)** |
| **Cas d'usage recommandés** | Contrôleurs Active Directory, Pare-feu pfSense/OPNsense, environnements Windows | Serveurs Web Nginx, bases PostgreSQL, serveurs DNS Bind9, reverse-proxies |

---

## 3. Le Système de Configuration Distribué : `pmxcfs`

Proxmox stocke l'intégralité de sa configuration sous le répertoire virtuel `/etc/pve/`.
- Ce dossier s'appuie sur le système de fichiers en mémoire **`pmxcfs`** (_Proxmox Cluster File System_) adossé à une base SQLite.
- En cluster multi-nœuds, le moteur de consensus **Corosync** réplique en temps réel chaque modification de fichier sous `/etc/pve/` (fichiers `.conf` des VMs et conteneurs, clés de stockage, pare-feu) sur tous les nœuds du cluster.

---

## 4. Types et Architecture du Stockage sous Proxmox

Proxmox classe les espaces de stockage en deux familles majeures (`/etc/pve/storage.cfg`) :

### 4.1. Stockage de type Bloc (Haute performance pour disques de VMs)
- **LVM / LVM-Thin** : Stockage local rapide. Le mode _LVM-Thin_ permet le sur-provisionnement (_Thin Provisioning_) et la création d'instantanés (_Snapshots_).
- **ZFS** : Système de fichiers avancé gérant le RAID logiciel intégré (Z1, Z2, Mirror), la compression à la volée, le contrôle d'intégrité par checksums et les snapshots instantanés.
- **Ceph RBD** : Stockage bloc distribué et hautement disponible pour clusters multi-serveurs.

### 4.2. Stockage de type Fichier (Partagé et universel)
- **Directory** : Dossier standard de l'OS hôte (`/var/lib/vz`) pour stocker images ISO, templates d'OS et sauvegardes VZDump.
- **NFS / SMB (CIFS)** : Partages réseau distants pour stocker les sauvegardes centralisées et les disques partagés entre nœuds.

---

## 5. Commandes CLI d'Exploitation

Chaque action réalisable dans l'interface graphique possède son équivalent en ligne de commande :

```bash
# --- Gestion des VMs KVM avec 'qm' ---
# Lister les VMs du nœud local
qm list

# Démarrer, arrêter, redémarrer ou éteindre brutalement une VM (ID 100)
qm start 100
qm shutdown 100
qm stop 100

# Créer un snapshot de sécurité nommé 'avant-maj'
qm snapshot 100 avant-maj --description "Snapshot avant mise a niveau OS"

# Afficher la configuration matérielle d'une VM
qm config 100

# --- Gestion des Conteneurs LXC avec 'pct' ---
# Lister les conteneurs
pct list

# Entrer dans la console d'un conteneur en direct (sans SSH)
pct enter 101

# Redémarrer un conteneur
pct restart 101

# --- Gestion des Stockages avec 'pvesm' ---
# Consulter l'espace utilisé par chaque pool de stockage
pvesm status

# Lister le contenu d'un stockage (ex: local-lvm)
pvesm list local-lvm
```
