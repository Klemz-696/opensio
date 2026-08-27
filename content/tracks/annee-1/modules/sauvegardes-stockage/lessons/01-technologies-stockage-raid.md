---
slug: technologies-stockage-raid
title: "Technologies de stockage et architectures RAID (0, 1, 5, 6, 10)"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 45
objectives:
  - "Comprendre les caractéristiques des supports de stockage (HDD SATA/SAS, SSD SATA, NVMe U.2/U.3/PCIe)"
  - "Distinguer les architectures de stockage en réseau DAS, NAS (NFS, SMB) et SAN (iSCSI, Fibre Channel)"
  - "Distinguer le RAID matériel (carte contrôleur avec cache et batterie BBU) du RAID logiciel (mdadm, ZFS)"
  - "Calculer la capacité utile, les performances et la tolérance aux pannes des niveaux RAID 0, 1, 5, 6 et 10"
  - "Comprendre le rôle du disque de secours à chaud (Hot Spare) et le processus de reconstruction (Rebuild)"
prerequisites:
  - "linux-administration"
competency_refs:
  - "B1.1"
  - "B2.3"
  - "B3.4"
success_criteria:
  - "Réussir le quiz 'Technologies de Stockage et RAID' avec au moins 80 %"
labs: []
references:
  - label: "Linux RAID Wiki — Software RAID with mdadm"
    url: "https://raid.wiki.kernel.org/index.php/A_simple_MDADM_tutorial"
  - label: "SNIA (Storage Networking Industry Association) — Storage Fundamentals"
    url: "https://www.snia.org/education/storage-networking-primer"
---

# Technologies de Stockage et Architectures RAID

La gestion et la sécurisation du stockage de masse constituent l'un des piliers essentiels de l'administration d'infrastructure. Une défaillance de disque dur sans redondance peut entraîner une perte de données irrémédiable et l'arrêt total des activités de l'entreprise.

---

## 1. Familles de Disques et Interfaces Physiques

Les serveurs d'entreprise exploitent différents types de supports selon les exigences de coût, de capacité et de rapidité d'accès (IOPS et temps de latence) :

| Support & Interface | Technologie | Débit Maximal Réel | IOPS Moyennes | Cas d'usage privilégiés |
|---|---|---|---|---|
| **HDD SATA / SAS** (3.5") | Disque magnétique rotatif (7200 à 15000 tr/min) | 150 à 250 Mo/s | 75 à 200 IOPS | Stockage de masse volumineux, archivage froid, dépôts de sauvegardes secondaires |
| **SSD SATA** (2.5") | Mémoire Flash NAND | ~550 Mo/s (limite du bus SATA 6 Gbps) | 50 000 à 90 000 IOPS | Serveurs standards, mise à niveau de parcs existants |
| **SSD NVMe U.2 / U.3 / M.2** | Mémoire Flash NAND sur bus **PCIe 4.0 / 5.0** | 3 500 à 7 500 Mo/s | **500 000 à 1 500 000+ IOPS** | Bases de données transactionnelles (PostgreSQL, SQL Server), hyperviseurs Proxmox / ESXi |

---

## 2. Architectures de Stockage : DAS, NAS et SAN

```text
+---------------------+     +--------------------------+     +--------------------------+
|  DAS (Direct-Attach)|     |    NAS (Network-Attach)  |     |     SAN (Storage Area)   |
+---------------------+     +--------------------------+     +--------------------------+
|  Disques branchés   |     |  Serveur de fichiers     |     |  Réseau dédié bloc haute |
|  directement dans   |     |  partagé sur LAN IP      |     |  vitesse (iSCSI / FC)    |
|  le serveur (SATA/  |     |  Protocoles :            |     |  Protocoles :            |
|  SAS/NVMe interne)  |     |  - NFS (Linux)           |     |  - iSCSI (Ethernet)      |
|                     |     |  - SMB/CIFS (Windows)    |     |  - Fibre Channel (FC)    |
| Accès : Niveau BLOC |     | Accès : Niveau FICHIER   |     | Accès : Niveau BLOC (LUN)|
+---------------------+     +--------------------------+     +--------------------------+
```

---

## 3. Niveaux RAID : Architectures et Calculs

Le **RAID** (_Redundant Array of Independent Disks_) regroupe plusieurs disques physiques pour former une seule unité logique offrant redondance, performances ou les deux :

```text
  [ RAID 1 (Miroir) ]               [ RAID 5 (Parité distribuée) ]          [ RAID 10 (1+0 Miroir agrégé) ]
+-------+   +-------+           +-------+ +-------+ +-------+ +-------+        +-------------+ +-------------+
| D1 (A)|   | D2 (A)|           | D1 (A)| | D2 (B)| | D3 (C)| | D4(P1)|        |   Miroir 1  | |   Miroir 2  |
|-------|   |-------|           |-------| |-------| |-------| |-------|        | [D1]   [D2] | | [D3]   [D4] |
| D1 (B)|   | D2 (B)|           | D1 (D)| | D2 (E)| | D3(P2)| | D4 (F)|        | (A)     (A) | | (B)     (B) |
+-------+   +-------+           +-------+ +-------+ +-------+ +-------+        +-------------+ +-------------+
 Tolérance : 1 disque            Tolérance : 1 disque (Parité XOR)               Tolérance : 1 disque par miroir
```

### Synthèse Comparative des Niveaux RAID :

| Niveau RAID | Nom & Principe | Disques Minimum | Capacité Utile ($N$ disques de taille $C$) | Tolérance aux Pannes | Gain Lecture / Écriture |
|---|---|:---:|---|---|---|
| **RAID 0** | Agrégation par bandes (_Striping_) | 2 | $N \times C$ (100 %) | **0 disque** (1 panne = perte totale) | Lecture ++ / Écriture ++ |
| **RAID 1** | Mise en miroir (_Mirroring_) | 2 | $1 \times C$ (50 % pour 2 disques) | 1 disque (sur 2) | Lecture + / Écriture neutre |
| **RAID 5** | Bandes avec parité distribuée | 3 | $(N - 1) \times C$ | **1 disque** | Lecture ++ / Écriture - (Pénalité calcul parité) |
| **RAID 6** | Bandes avec double parité | 4 | $(N - 2) \times C$ | **2 disques simultanés** | Lecture ++ / Écriture -- (Double calcul) |
| **RAID 10** | Combinaison RAID 1 + RAID 0 | 4 | $(N / 2) \times C$ (50 %) | **1 à 2 disques** (1 par paire miroir) | **Lecture +++ / Écriture +++** (Optimal bdd) |

> [!IMPORTANT]
> **Règle d'or de l'administrateur système** : Le RAID assure la **haute disponibilité matérielle** et la continuité de service en cas de panne de disque, mais **LE RAID N'EST PAS UNE SAUVEGARDE**. Il ne protège ni contre la suppression accidentelle, ni contre les ransomwares, ni contre les sinistres physiques (incendie, vol, surtension).

---

## 4. Disque de Secours (_Hot Spare_) et Reconstruction (_Rebuild_)

- **Disque Hot-Spare** : Un disque physique supplémentaire préinstallé dans le châssis serveur, maintenu en veille. Dès qu'un disque du volume RAID tombe en panne, le contrôleur l'active automatiquement et lance la reconstruction sans intervention humaine immédiate.
- **Pénalité de reconstruction (_Rebuild Overhead_)** : Durant la reconstruction (qui peut durer de 6 à 24 heures sur de gros disques HDD de 12 To+), les performances d'E/S chutent et le risque de survenue d'une seconde panne sur un autre disque est maximal (d'où l'intérêt du **RAID 6** ou **RAID 10** sur les gros volumes).

---

## 5. RAID Matériel vs RAID Logiciel sous Linux (`mdadm`)

### 5.1. RAID Matériel
Géré par une carte contrôleur dédiée (Dell PERC, HPE Smart Array) avec processeur XOR intégré, mémoire cache (1 à 8 Go) et batterie de secours BBU (_Battery Backup Unit_) pour sécuriser les écritures en cache en cas de coupure de courant.

### 5.2. RAID Logiciel avec `mdadm` sous Linux
Géré directement par le noyau Linux, économique et indépendant de tout contrôleur propriétaire :

```bash
# Créer une grappe RAID 1 logicielle (/dev/md0) avec deux disques /dev/sdb et /dev/sdc
mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sdb /dev/sdc

# Consulter l'état de synchronisation en temps réel
cat /proc/mdstat
mdadm --detail /dev/md0

# Simuler une panne de disque sur /dev/sdb
mdadm --manage /dev/md0 --fail /dev/sdb

# Remplacer le disque défectueux par /dev/sdd
mdadm --manage /dev/md0 --remove /dev/sdb
mdadm --manage /dev/md0 --add /dev/sdd
```
