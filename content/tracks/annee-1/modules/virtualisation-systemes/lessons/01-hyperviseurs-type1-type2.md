---
slug: hyperviseurs-type1-type2
title: "Principes de la virtualisation : hyperviseurs Type 1 (Bare-Metal) vs Type 2 (Hosted)"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 45
objectives:
  - "Comprendre les principes fondamentaux et les bénéfices de la virtualisation de serveurs"
  - "Distinguer l'architecture d'un hyperviseur Type 1 (Bare-Metal) et d'un hyperviseur Type 2 (Hosted)"
  - "Identifier le rôle des extensions processeur matérielles (Intel VT-x, AMD-V, EPT, NPT/RVI)"
  - "Comprendre le fonctionnement du couple KVM (module noyau) et QEMU (émulateur d'espace utilisateur)"
  - "Comparer les cas d'usage entre virtualisation complète, paravirtualisation et virtualisation imbriquée"
prerequisites:
  - "linux-administration"
competency_refs:
  - "B1.1"
  - "B1.5"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Hyperviseurs Type 1 et Type 2' avec au moins 80 %"
labs: []
references:
  - label: "Documentation Kernel.org — Kernel-based Virtual Machine (KVM)"
    url: "https://www.kernel.org/doc/html/latest/virt/kvm/index.html"
  - label: "QEMU Documentation — Architecture & Hardware Virtualization"
    url: "https://www.qemu.org/documentation/"
---

# Principes de la Virtualisation : Hyperviseurs Type 1 vs Type 2

La **virtualisation** est une technologie logicielle permettant d'exécuter plusieurs systèmes d'exploitation invités (_Guest OS_) de manière isolée et simultanée sur une unique machine physique hôte (_Host_). Elle optimise l'utilisation des ressources matérielles (CPU, RAM, stockage, réseau) et réduit drastiquement les coûts d'infrastructure et d'énergie.

---

## 1. Classification des Hyperviseurs

L'**hyperviseur** (ou _Virtual Machine Monitor_ - VMM) est la couche logicielle responsable de l'allocation, de l'émulation et du contrôle d'accès aux ressources physiques.

```text
+------------------------------------+      +------------------------------------+
|     Hyperviseur Type 1 (Bare-Metal) |      |       Hyperviseur Type 2 (Hosted)  |
+------------------------------------+      +------------------------------------+
|  VM 1 (Linux)   |   VM 2 (Windows) |      |  VM 1 (Linux)   |   VM 2 (Windows) |
+-----------------+------------------+      +-----------------+------------------+
|      Hyperviseur / Noyau KVM       |      | Hyperviseur (VirtualBox, VMware WS)|
+------------------------------------+      +------------------------------------+
|        Matériel Physique           |      |    Système d'exploitation Hôte     |
|   (CPU, RAM, Disques, NICs)        |      +------------------------------------+
|                                    |      |        Matériel Physique           |
+------------------------------------+      +------------------------------------+
```

### 1.1. Hyperviseurs Type 1 (Bare-Metal / Natifs)
- **Fonctionnement** : L'hyperviseur s'exécute directement sur le matériel physique sans couche intermédiaire d'un système d'exploitation généraliste de bureau.
- **Performances** : Latence minimale, accès quasi direct aux registres et instructions CPU, isolation forte.
- **Exemples majeurs d'entreprise** :
  - **Proxmox VE / KVM** (Open Source, base Debian)
  - **VMware ESXi** (Propriétaire)
  - **Microsoft Hyper-V Server**
  - **Xen / Citrix Hypervisor**

### 1.2. Hyperviseurs Type 2 (Hosted / Hébergés)
- **Fonctionnement** : L'hyperviseur s'exécute comme une application logicielle standard au-dessus d'un système d'exploitation hôte (Windows 11, macOS, Ubuntu Desktop).
- **Performances** : Dégradées en raison de la double couche d'abstraction (l'OS hôte consomme des ressources et ordonnance les E/S).
- **Exemples courants** :
  - **Oracle VirtualBox**
  - **VMware Workstation Pro / Fusion**
  - **QEMU en mode émulation pure**

---

## 2. Assistance Matérielle à la Virtualisation

Pour atteindre des performances proches du natif (_Near-Bare-Metal_), les processeurs modernes intègrent des instructions matérielles spécialisées :

| Technologie | Fabricant | Fonction & Rôle |
|---|---|---|
| **VT-x / AMD-V** | Intel / AMD | Permet l'exécution directe des instructions privilégiées du processeur par l'OS invité sans émulation logicielle lente (Ring -1 / VMX Root Operation). |
| **EPT / NPT (RVI)** | Intel / AMD | _Extended Page Tables_ / _Nested Page Tables_ : Traduction matérielle directe des adresses mémoire de la VM vers la RAM physique sans intervention logicielle du VMM. |
| **VT-d / AMD-Vi** | Intel / AMD | _I/O MMU_ : Permet le passage direct d'un périphérique physique (carte réseau PCIe, carte graphique GPU) à une VM dédiée (_PCIe Passthrough_). |

### Vérification sous Linux :
```bash
# Vérifier la présence des extensions de virtualisation matérielle
egrep -c '(vmx|svm)' /proc/cpuinfo
# (Une valeur > 0 indique le support actif : vmx = Intel, svm = AMD)
```

---

## 3. Le Couple KVM et QEMU sous Linux

Dans l'écosystème open-source d'entreprise, la virtualisation repose sur la synergie entre **KVM** et **QEMU** :

1. **KVM (_Kernel-based Virtual Machine_)** :
   - C'est un module officiel du noyau Linux (`kvm.ko`, `kvm_intel.ko` / `kvm_amd.ko`).
   - Il transforme le noyau Linux en un véritable hyperviseur Type 1.
   - Il gère l'accès direct aux vCPUs et à la mémoire physique via les instructions VT-x/AMD-V.
2. **QEMU (_Quick Emulator_)** :
   - S'exécute en espace utilisateur (_User-Space_).
   - Il émule l'ensemble des composants de la carte mère (bus PCI, contrôleurs IDE/SATA/SCSI, cartes réseau virtuelles, interfaces graphiques, BIOS/UEFI SeaBIOS/OVMF).

---

## 4. Paravirtualisation et Pilotes VirtIO

Plutôt que d'émuler un matériel physique ancien (ex: une carte réseau Intel e1000 ou un contrôleur IDE), la **paravirtualisation** utilise des pilotes virtuels spécialement conçus pour communiquer directement avec l'hyperviseur :

- **`virtio-net`** : Interface réseau paravirtualisée offrant des débits 10 Gbps+ avec très faible charge CPU.
- **`virtio-scsi` / `virtio-blk`** : Contrôleurs de disques haute vitesse supportant les commandes TRIM/Discard et les files d'attente multiples (_Multi-Queue_).
- **`virtio-balloon`** : Gestion dynamique et réallocation de la mémoire vive entre l'hôte et la VM.

---

## 5. Virtualisation Imbriquée (_Nested Virtualization_)

La **virtualisation imbriquée** permet d'exécuter un hyperviseur (ex: Proxmox VE ou KVM) à l'intérieur même d'une machine virtuelle.
Indispensable pour les environnements de formation, maquettage et laboratoires de test (Homelab).

```bash
# Activer la virtualisation imbriquée sur l'hôte KVM Intel
modprobe -r kvm_intel
modprobe kvm_intel nested=1

# Vérifier l'activation
cat /sys/module/kvm_intel/parameters/nested
# (Retourne 'Y' pour actif)
```
