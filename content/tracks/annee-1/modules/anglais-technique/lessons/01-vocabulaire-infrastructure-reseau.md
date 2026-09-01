---
slug: vocabulaire-infrastructure-reseau
title: "Vocabulaire anglais de l'infrastructure, du matériel et des réseaux"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 1
estimated_minutes: 40
objectives:
  - "Maîtriser le lexique anglophone fondamental des composants matériels de serveurs (chassis, rack, blade, PSU, NIC, HBA)"
  - "Comprendre la terminologie des équipements réseau et de la connectique (patch cord, transceiver, SFP+, unmanaged/managed switch)"
  - "Distinguer les termes de virtualisation et de stockage (hypervisor, bare-metal, storage array, hot-swap, throughput, latency)"
  - "Identifier les faux-amis et pièges linguistiques fréquents en informatique"
prerequisites:
  - "reseaux-fondamentaux"
  - "linux-administration"
competency_refs:
  - "B1.1"
  - "B1.2"
  - "B2.1"
success_criteria:
  - "Réussir le quiz 'Vocabulaire Infrastructure et Réseaux' avec au moins 80 %"
labs: []
references:
  - label: "IEEE Standard Glossary of Computer Hardware Terminology"
    url: "https://standards.ieee.org/"
  - label: "Cisco Networking Glossary"
    url: "https://www.cisco.com/c/en/us/support/docs/glossary.html"
---

# Vocabulaire Anglais de l'Infrastructure, du Matériel et des Réseaux

Dans le domaine de l'administration systèmes et réseaux (SISR), la quasi-totalité des spécifications matérielles, des interfaces d'administration (BIOS/UEFI, iDRAC, ILO) et des commutateurs sont rédigées en anglais. Une maîtrise précise du vocabulaire technique est indispensable.

---

## 1. Hardware & Server Architecture (Matériel Serveur)

| English Term | French Equivalent | Definition / Technical Context |
|---|---|---|
| **Chassis / Rack / Enclosure** | Châssis / Baie / Armoire | The physical frame housing servers and network appliances (e.g., *42U Server Rack*). |
| **Power Supply Unit (PSU)** | Bloc d'alimentation | Delivers electrical power to components, often configured with *redundant hot-swappable PSUs*. |
| **Hot-Swappable / Hot-Plug** | Remplaçable à chaud | The ability to replace a faulty drive or PSU while the server remains powered on and running. |
| **Network Interface Card (NIC)** | Carte d'interface réseau | Physical network card providing Ethernet or optical connectivity (e.g., *Dual-port 10GbE NIC*). |
| **Host Bus Adapter (HBA)** | Carte contrôleur de stockage | Circuit board connecting the server host to SAN storage arrays via Fibre Channel or SAS. |
| **Form Factor** | Facteur de forme / Format | Physical dimension of hardware (e.g., *1U/2U Rackmount*, *Blade server*, *Tower*). |
| **Throughput / Bandwidth** | Débit réel / Bande passante | The actual amount of data transferred per unit of time versus the maximum channel capacity. |

```text
+-------------------------------------------------------------------------------+
|                      2U RACKMOUNT ENTERPRISE SERVER                           |
+-------------------------------------------------------------------------------+
| [ Drive Bay 0 ] [ Drive Bay 1 ] [ Drive Bay 2 ] [ Drive Bay 3 ] (Hot-Swap)    |
| [ CPU 0 Socket ] [ CPU 1 Socket ]    [ 16x DDR5 ECC RAM Slots (32 GB/DIMM) ]  |
| [ Redundant PSU 1 (800W) ] [ Redundant PSU 2 (800W) ] [ Dual 25GbE SFP28 NIC] |
+-------------------------------------------------------------------------------+
```

---

## 2. Networking & Cabling Terminology (Réseaux et Câblage)

| English Term | French Equivalent | Example / Usage |
|---|---|---|
| **Patch Cord / Patch Cable** | Cordon de brassage | An Ethernet cable used to connect a server NIC to a patch panel or top-of-rack switch. |
| **Patch Panel** | Panneau de brassage | Passive hardware unit with ports used to organize and route structured network cabling. |
| **Transceiver / SFP+ / QSFP** | Module optique émetteur-récepteur | Small form-factor pluggable module for optical fiber links (10 Gbps / 40 Gbps / 100 Gbps). |
| **Unmanaged vs Managed Switch** | Commutateur non administrable vs administrable | A managed switch supports VLAN configuration, QoS, SNMP and port mirroring. |
| **Uplink / Trunk Link** | Liaison montante / Agrégation | High-capacity port connecting an access switch to the core distribution layer. |
| **Default Gateway** | Passerelle par défaut | The router IP address forwarding traffic to external destinations outside the local subnet. |
| **Broadcast Domain** | Domaine de diffusion | Network segment where any host broadcast frame is received by all member nodes. |

---

## 3. False Friends & Frequent Pitfalls (Faux-Amis et Pièges)

> [!WARNING]
> **Attention aux faux-amis fréquents en anglais informatique !**
> - **`Facility`** : Ne signifie pas « facilité », mais **infrastructure / bâtiment / installation** (ex: *Data center facility*).
> - **`Legacy`** : Ne signifie pas « légal », mais **hérité / ancien / obsolète** (ex: *Legacy operating system*).
> - **`Location`** : Ne signifie pas « location financière », mais **emplacement / lieu physique** (ex: *Server location: Rack 04*).
> - **`Supply`** : Fourniture / alimentation (ex: *Power Supply*).
> - **`To deprecate`** : Déclarer obsolète / déconseiller l'usage (ex: *TLS 1.0 is deprecated*).
> - **`To provision`** : Allouer / déployer des ressources (ex: *Provision a new virtual disk*).

---

## 4. Useful Expressions in Professional Context

- *"The server is experiencing high I/O latency due to a degraded RAID array."*  
  (Le serveur subit une forte latence d'E/S en raison d'une grappe RAID dégradée.)
- *"Please patch the web server to the latest Long-Term Support (LTS) release."*  
  (Veuillez appliquer les correctifs au serveur web vers la dernière version supportée à long terme.)
- *"The link went down because the optical transceiver was unplugged."*  
  (La liaison est tombée parce que le module émetteur-récepteur optique a été débranché.)
