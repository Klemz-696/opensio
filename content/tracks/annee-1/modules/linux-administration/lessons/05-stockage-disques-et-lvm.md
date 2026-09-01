---
slug: stockage-disques-et-lvm
title: "Partitionnement, systèmes de fichiers, montage persistant et gestionnaire de volumes logiques (LVM)"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 3
estimated_minutes: 55
objectives:
  - "Comprendre la différence entre les tables de partitionnement MBR et GPT"
  - "Créer et formater des partitions (fdisk, parted, mkfs.ext4, mkfs.xfs)"
  - "Gérer le montage persistant des systèmes de fichiers via /etc/fstab et l'identifiant UUID"
  - "Maîtriser l'architecture LVM : Volumes Physiques (PV), Groupes de Volumes (VG) et Volumes Logiques (LV)"
  - "Agrandir dynamiquement un volume logique et son système de fichiers à chaud"
prerequisites:
  - "arborescence-fhs-et-permissions"
competency_refs:
  - "B1.1"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Stockage, Disques et LVM' avec au moins 80 %"
  - "Valider l'atelier 'Configuration du Stockage LVM'"
labs:
  - slug: configuration-stockage-lvm
    required: true
references:
  - label: "Documentation Red Hat — Guide d'administration du stockage LVM"
    url: "https://docs.redhat.com/fr/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_logical_volumes/index"
  - label: "Documentation Debian — Gestion des disques et fstab"
    url: "https://wiki.debian.org/fr/fstab"
---

# Partitionnement, Systèmes de Fichiers, Montage Persistant et LVM

La gestion du stockage sur un serveur d'entreprise doit concilier performance, fiabilité et souplesse d'extension. L'association du partitionnement moderne **GPT**, des systèmes de fichiers journalisés (`ext4`, `xfs`) et du gestionnaire de volumes **LVM** (_Logical Volume Manager_) offre une flexibilité maximale.

---

## 1. Partitionnement et Systèmes de Fichiers

### 1.1. MBR vs GPT
- **MBR** (_Master Boot Record_) : Limité à 2 To de capacité et 4 partitions primaires. Obsolète.
- **GPT** (_GUID Partition Table_) : Supporte des disques jusqu'à plusieurs zettaoctets et jusqu'à 128 partitions par défaut. Requis pour le démarrage UEFI.

### 1.2. Commandes de partitionnement et formatage
```bash
# Identifier les disques physiques et partitions existantes
lsblk -f

# Partitionner un disque avec fdisk ou parted
fdisk /dev/sdb

# Formater une partition en système de fichiers ext4 journalisé
mkfs.ext4 -L "DATA_PROD" /dev/sdb1

# Formater en XFS (très performant pour les gros volumes de données)
mkfs.xfs -L "BACKUPS" /dev/sdc1
```

---

## 2. Montage Persistant : Le Fichier `/etc/fstab`

Chaque ligne de `/etc/fstab` décrit un point de montage automatique au démarrage du système :

```text
UUID=a1b2c3d4-e5f6-7890-abcd-ef1234567890   /var/log   ext4   defaults,noatime,nodev   0   2
└────────────────────┬───────────────────┘   └───┬──┘   └─┬──┘   └──────────┬───────────┘   ┬   ┬
                     │                           │        │                 │               │   └── Ordre fsck (1=racine, 2=autres, 0=pas de vérif)
                     │                           │        │                 │               └────── Sauvegarde dump (obsolète, 0)
                     │                           │        │                 └────────────────────── Options de montage
                     │                           │        └──────────────────────────────────────── Type de système de fichiers
                     │                           └───────────────────────────────────────────────── Point de montage dans l'arborescence
                     └───────────────────────────────────────────────────────────────────────────── Identifiant unique UUID du volume
```

### Options de montage recommandées pour la sécurité et la performance :
- `defaults` : regroupe `rw`, `suid`, `dev`, `exec`, `auto`, `nouser`, `async`.
- `noatime` : désactive la mise à jour de la date de dernier accès à chaque lecture (gain I/O important).
- `nodev` : interdit l'interprétation de périphériques spéciaux sur la partition.
- `nosuid` : bloque l'effet des bits SUID/SGID (recommandé sur `/home` et `/tmp`).
- `noexec` : interdit l'exécution directe de binaires (recommandé sur `/tmp`).

```bash
# Obtenir les UUIDs des périphériques
blkid

# Tester le fichier /etc/fstab sans redémarrer (monte tout ce qui est déclaré)
mount -a
```

---

## 3. Architecture LVM (Logical Volume Manager)

LVM ajoute une couche d'abstraction logicielle entre les disques physiques et les systèmes de fichiers :

```text
+-------------------------------------------------------------+
|               Système de fichiers (ext4 / xfs)              |
+-------------------------------------------------------------+
|        Volume Logique (LV) : /dev/vg_system/lv_data         |
+-------------------------------------------------------------+
|        Groupe de Volumes (VG) : vg_system (ex: 500 Go)      |
+------------------------------+------------------------------+
|     Volume Physique (PV)     |     Volume Physique (PV)     |
|          /dev/sdb1           |          /dev/sdc1           |
+------------------------------+------------------------------+
```

### 3.1. Les trois strates LVM :
1. **PV (Physical Volume)** : Disque ou partition initialisé pour LVM (`pvcreate`).
2. **VG (Volume Group)** : Pool de stockage agrégeant un ou plusieurs PVs (`vgcreate`).
3. **LV (Logical Volume)** : Partition logique découpée dans le VG (`lvcreate`), formatée ensuite.

---

## 4. Guide Pratique des Commandes LVM

```bash
# 1. Initialiser des disques en PVs LVM
pvcreate /dev/sdb /dev/sdc

# 2. Créer un groupe de volumes nommé 'vg_data'
vgcreate vg_data /dev/sdb /dev/sdc

# 3. Créer un volume logique 'lv_web' de 50 Go dans 'vg_data'
lvcreate -n lv_web -L 50G vg_data

# 4. Formater le volume logique
mkfs.ext4 /dev/vg_data/lv_web

# 5. Créer le point de montage et monter
mkdir -p /var/www
mount /dev/vg_data/lv_web /var/www

# --- Extension à chaud d'un volume LVM (quand l'espace manque) ---

# 6. Ajouter 20 Go au volume logique ET redimensionner le système de fichiers ext4 en 1 commande
lvextend -L +20G -r /dev/vg_data/lv_web

# 7. Ajouter un nouveau disque physique au groupe de volumes existant
pvcreate /dev/sdd
vgextend vg_data /dev/sdd
```
