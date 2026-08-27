---
slug: dimensionnement-ressources-quotas
title: "Dimensionnement des ressources, sur-allocation (Overcommit), VirtIO-Balloon et quotas"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 45
objectives:
  - "Comprendre les principes d'allocation des cœurs processeurs (vCPUs) et de la mémoire vive (vRAM)"
  - "Maîtriser le ratio de sur-allocation (Overcommitment ratio) pour optimiser la densité sans dégradation de performance"
  - "Comprendre le mécanisme de récupération de mémoire vive VirtIO Ballooning"
  - "Organiser les machines virtuelles et utilisateurs dans des Pools de Ressources Proxmox"
  - "Configurer la limitation des entrées/sorties disques (IOPS et débit Mo/s) pour éviter les voisins bruyants (Noisy Neighbors)"
prerequisites:
  - "hyperviseurs-type1-type2"
  - "architecture-proxmox-ve"
competency_refs:
  - "B1.1"
  - "B1.5"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Dimensionnement des Ressources et Quotas' avec au moins 80 %"
labs: []
references:
  - label: "Proxmox VE — Memory Ballooning & Resource Scheduling"
    url: "https://pve.proxmox.com/pve-docs/chapter-qm.html#qm_memory"
  - label: "Red Hat Enterprise Linux — Virtualization Tuning and Optimization Guide"
    url: "https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/html/virtualization_tuning_and_optimization_guide/index"
---

# Dimensionnement des Ressources, Sur-Allocation et Quotas

L'un des principaux atouts de la virtualisation réside dans l'optimisation financière et technique des serveurs grâce au partage dynamique des capacités matérielles. Toutefois, sans politique de dimensionnement rigoureuse, les phénomènes de contention peuvent dégrader l'ensemble des services hébergés.

---

## 1. Sur-Allocation de Ressources (_Overcommitment_)

La **sur-allocation** consiste à allouer aux machines virtuelles une quantité cumulée de ressources supérieure aux capacités physiques réelles de la machine hôte, en pariant que toutes les VMs n'utiliseront pas 100 % de leurs ressources au même instant.

### 1.1. Sur-Allocation Processeur (Ratio vCPU / pCPU)
- Un serveur physique bi-socket avec 2 processeurs de 16 cœurs (32 cœurs / 64 threads) dispose de **64 pCPUs logiques**.
- **Ratios recommandés en production** :
  - **Bases de données / Traitements critiques** : Ratio **1:1 à 1.5:1** (aucune contention tolérée).
  - **Serveurs d'applications d'entreprise / Web** : Ratio **2:1 à 3:1**.
  - **Postes virtuels VDI / Environnements de formation** : Ratio **4:1 à 6:1**.

### 1.2. Sur-Allocation Mémoire (vRAM)
Contrairement aux vCPUs qui peuvent être facilement ordonnancés dans le temps, la mémoire vive ne peut pas être découpée arbitrairement : si la RAM physique est saturée, le noyau hôte déclenche le **Swap** (effondrement des performances I/O) ou tue des processus via l'**OOM Killer** (_Out Of Memory Killer_).

---

## 2. Le Mécanisme de Ballon Mémoire (_VirtIO Memory Ballooning_)

Le pilote **VirtIO Ballooning** permet à l'hyperviseur de récupérer dynamiquement de la mémoire inutilisée auprès d'une machine virtuelle pour la réaffecter à une autre VM sous tension, sans nécessiter d'arrêt.

```text
       [ Mémoire Hôte sous Tension ]
                     │
         Demande de réduction de RAM
                     │
                     ▼
+---------------------------------------------------+
|               Machine Virtuelle Invité            |
|                                                   |
|  +---------------------+   +-------------------+  |
|  |  Mémoire Active     |   |   Pilote Ballon   |  |
|  |  Applications Web   |   |  (virtio_balloon) |  |
|  |     (2 Go)          |   |  Se gonfle et     |  |
|  |                     |   |  réserve 2 Go     |  |
|  +---------------------+   +---------┬---------+  |
|                                      │            |
+──────────────────────────────────────┼────────────+
                                       │
                Libération de 2 Go de RAM physique
                restitués au pool de l'hôte Proxmox
```

### Configuration sous Proxmox :
Dans les options de la VM :
- **Memory (RAM)** : Plafond maximal (ex: 8192 Mo).
- **Minimum memory** : Seuil plancher garanti (ex: 2048 Mo).

---

## 3. Gestion des Voisins Bruyants (_Noisy Neighbors_) et Limites I/O

Lorsqu'une machine virtuelle exécute une tâche lourde (sauvegarde non planifiée, compilation massive), elle risque de monopoliser toute la bande passante du stockage ou du réseau au détriment des autres VMs.

Proxmox permet d'appliquer des **quotas matériels stricts** sur les disques virtuels (`qm set <vmid> --scsi0 ...,mbps_rd=100,mbps_wr=50,iops_rd=1000,iops_wr=500`) :

| Paramètre | Rôle & Unité | Cas d'usage |
|---|---|---|
| `mbps_rd` / `mbps_wr` | Débit maximal de lecture / écriture (Mo/s) | Limiter les transferts de fichiers volumineux |
| `iops_rd` / `iops_wr` | Nombre maximal d'opérations d'E/S par seconde | Empêcher une base de données d'engorger le contrôleur |
| `rate` (sur net0) | Débit réseau maximal (Mo/s) | Éviter la saturation du lien physique |

---

## 4. Organisation par Pools de Ressources

Un **Pool de Ressources** Proxmox regroupe logiquement plusieurs VMs, conteneurs LXC et espaces de stockage pour une équipe ou un service (ex: `Pool-Comptabilite`, `Pool-Etudiants-Promo2026`).

```bash
# 1. Créer un pool de ressources nommé 'Promo-SISR-A1'
pveum pool add Promo-SISR-A1 --comment "Machines des etudiants SISR 1ere annee"

# 2. Assigner des VMs au pool
pveum pool set Promo-SISR-A1 -vms 101,102,103

# 3. Déléguer les droits d'administration (Rôle PVEVMUser) sur ce pool à un groupe
pveum acl modify /pool/Promo-SISR-A1 -groups Formateurs -roles PVEVMAdmin
```

---

## 5. Synthèse & Bonnes Pratiques de Dimensionnement

1. **Commencez toujours petit** : Allouez 2 vCPUs et 2-4 Go de RAM à une VM au départ. Il est simple et sans risque d'augmenter les ressources ultérieurement avec VirtIO.
2. **Surveillez l'indicateur CPU Steal Time** (`top` / `vmstat`) dans les VMs invitées : un taux de _steal_ > 5 % indique une sur-allocation excessive du processeur physique hôte.
3. **Installez systématiquement le `qemu-guest-agent`** dans chaque VM pour remonter les informations précises d'utilisation RAM et d'adresses IP vers Proxmox.
