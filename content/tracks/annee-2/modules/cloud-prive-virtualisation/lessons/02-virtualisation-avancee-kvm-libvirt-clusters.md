---
slug: virtualisation-avancee-kvm-libvirt-clusters
title: "Virtualisation Avancée : KVM, QEMU, Libvirt, Stockage Partagé et Live Migration"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 3
estimated_minutes: 55
objectives:
  - "Comprendre le fonctionnement du module noyau KVM et de l'émulateur QEMU"
  - "Optimiser les performances grâce aux pilotes paravirtualisés VirtIO"
  - "Administrer des machines virtuelles en CLI via l'API libvirt et l'outil virsh"
  - "Configurer des pools de stockage partagés et distribués (NFS, iSCSI, Ceph RBD)"
  - "Maîtriser la migration à chaud (Live Migration) et les mécanismes de protection contre le Split-Brain (Quorum/Fencing)"
prerequisites:
  - "linux-administration"
  - "concepts-cloud-computing-modeles-hybrides"
competency_refs:
  - "B2.1"
  - "B2.2"
success_criteria:
  - "Réussir le quiz 'Virtualisation Avancée KVM et Clusters' avec au moins 80 %"
labs:
  - slug: orchestration-vm-templates-cloudinit
    required: true
references:
  - label: "KVM Official Documentation (Kernel.org)"
    url: "https://www.linux-kvm.org/"
  - label: "Libvirt Virtualization API Documentation"
    url: "https://libvirt.org/docs.html"
---

# Virtualisation Avancée : KVM, QEMU, Libvirt, Stockage Partagé et Live Migration

**KVM** (*Kernel-based Virtual Machine*) est le standard industriel de virtualisation sous Linux, propulsant les plus grands centres de données mondiaux et plateformes de Cloud privé.

---

## 1. L'Écosystème KVM, QEMU et Paravirtualisation VirtIO

```mermaid
graph TD
    subgraph VM ["Machine Virtuelle Invitée (Guest OS)"]
        G_APP[Applications]
        G_OS[Noyau Invité Linux / Windows]
        VIO[Pilotes Paravirtualisés VirtIO : Net, SCSI, Balloon]
    end
    subgraph Host ["Système Hôte Linux (Host)"]
        QEMU[Processus Utilisateur QEMU : Émulation Périphériques & Bus]
        KVM[Module Noyau /dev/kvm : Exécution CPU & Mémoire Matérielle Intel VT-x/AMD-V]
    end
    G_OS --> VIO
    VIO --> QEMU
    QEMU <--> KVM
```

- **KVM** transforme le noyau Linux en hyperviseur de Type 1 : chaque machine virtuelle est un processus standard sous Linux ordonnancé directement par le CPU hôte.
- **QEMU** émule le BIOS/UEFI, les cartes mères virtuelles et les bus PCI.
- **VirtIO** élimine le coût d'émulation logicielle en faisant communiquer directement l'invité et l'hôte via des anneaux de mémoire partagée (*vrings*), offrant un débit réseau et disque proche du métal physique (*Bare-Metal*).

---

## 2. Administration Déclarative avec Libvirt et `virsh`

`libvirt` fournit une API unifiée et l'outil CLI **`virsh`** :

```bash
# Lister les machines virtuelles actives
virsh list --all

# Démarrer une machine virtuelle
virsh start srv-web-01

# Créer un snapshot cohérent à chaud
virsh snapshot-create-as --domain srv-web-01 --name snap_pre_upgrade --description "Avant MAJ OS"

# Afficher les interfaces réseau virtuelles
virsh domiflist srv-web-01
```

---

## 3. Stockage Partagé, Live Migration et Prévention du Split-Brain

Pour permettre le basculement instantané de machines virtuelles entre nœuds d'un cluster sans coupure de service (**Live Migration**) :

```mermaid
graph LR
    subgraph NodeA ["Hyperviseur Nœud 1"]
        VMA[VM Active en RAM]
    end
    subgraph NodeB ["Hyperviseur Nœud 2"]
        VMB[VM Réceptrice]
    end
    subgraph SAN ["Stockage Partagé (Ceph RBD / SAN iSCSI / NFS)"]
        DISK[(Disque Virtuel .qcow2 / RBD Image)]
    end
    VMA -.->|1. Transfert itératif de la RAM via réseau 10G/25G| VMB
    VMA ==>|2. Accès disque exclusif| DISK
    VMB ==>|3. Reprise instantanée I/O disque| DISK
```

### Mécanismes de résilience du cluster :
1. **Quorum Corosync** : Le cluster doit maintenir une majorité stricte de votes ($N/2 + 1$) pour autoriser les écritures et décisions de bascule automatique (**HA**).
2. **Fencing (STONITH)** : En cas de perte de communication d'un nœud, les nœuds survivants coupent immédiatement son alimentation électrique (via IPMI/iLO) pour empêcher qu'il n'écrive sur le stockage partagé en parallèle (**Split-Brain**).
