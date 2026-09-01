---
slug: reseau-virtuel-bridges-vlans
title: "Réseau virtuel sous Proxmox : Linux Bridges, agrégation d'interfaces (Bonds) et segmentation par VLANs"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 50
objectives:
  - "Comprendre le fonctionnement d'un pont logiciel Linux Bridge (vmbr0, vmbr1) comme commutateur virtuel L2"
  - "Configurer le fichier /etc/network/interfaces sous Debian/Proxmox pour les bridges et bonds"
  - "Segmenter les flux réseau des machines virtuelles à l'aide des tags VLANs 802.1Q (VLAN-aware Bridge vs Interfaces dédiées)"
  - "Mettre en œuvre des topologies d'isolation réseau (LAN interne privé sans accès direct, DMZ, passerelle pare-feu)"
  - "Découvrir les concepts de Software-Defined Networking (SDN) intégrés dans Proxmox VE"
prerequisites:
  - "architecture-proxmox-ve"
  - "vlan-segmentation"
competency_refs:
  - "B1.1"
  - "B2.1"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Réseau Virtuel Bridges et VLANs' avec au moins 80 %"
  - "Valider l'atelier 'Configuration des Interfaces Réseau Proxmox'"
labs:
  - slug: configuration-interfaces-proxmox
    required: true
references:
  - label: "Documentation Proxmox VE — Network Configuration"
    url: "https://pve.proxmox.com/pve-docs/pve-admin-guide.html#sysadmin_network_configuration"
  - label: "Debian Network Configuration Manual — Bridging and VLANs"
    url: "https://wiki.debian.org/fr/BridgeNetworkConnections"
---

# Réseau Virtuel sous Proxmox : Linux Bridges, Bonds et VLANs

Dans un environnement virtualisé, le réseau physique doit être étendu à l'intérieur du serveur hôte pour interconnecter les machines virtuelles et conteneurs entre eux ainsi qu'avec le réseau d'entreprise.

---

## 1. Le Concept de Pont Logiciel : Linux Bridge (`vmbr`)

Un **Linux Bridge** (nommé conventionnellement `vmbr0`, `vmbr1`...) agit exactement comme un **commutateur réseau virtuel de niveau 2 (Switch L2)** intégré dans le noyau Linux.

```text
+-------------------------------------------------------------------------------+
|                               Serveur Hôte Proxmox VE                         |
|                                                                               |
|   +-------------------+   +-------------------+   +-----------------------+   |
|   |   VM 100 (Linux)  |   | VM 101 (Windows)  |   |  Conteneur 102 (LXC)  |   |
|   |      [net0]       |   |      [net0]       |   |        [net0]         |   |
|   +---------┬---------+   +---------┬---------+   +-----------┬-----------+   |
|             │ tap100i0              │ tap101i0                │ veth102i0     |
|             ▼                       ▼                         ▼               |
|   +───────────────────────────────────────────────────────────────────────+   |
|   |                    Pont Virtuel Principal : vmbr0                     |   |
|   |                (Adresse IP de gestion : 192.168.10.250/24)            |   |
|   +───────────────────────────────────┬───────────────────────────────────+   |
|                                       │                                       |
|                                       ▼                                       |
|                  Carte Réseau Physique du Serveur : eno1                      |
+───────────────────────────────────────┬───────────────────────────────────────+
                                        │ (Câble Ethernet)
                                        ▼
                     Commutateur Physique du Réseau Local
```

---

## 2. Configuration du Fichier `/etc/network/interfaces`

Sous Proxmox VE, le paramétrage réseau est consigné dans `/etc/network/interfaces` :

```text
# Boucle locale (Loopback)
auto lo
iface lo inet loopback

# Carte réseau physique Ethernet (connectée au switch d'infrastructure)
iface eno1 inet manual

# Pont Virtuel Public (vmbr0) : relié à la carte physique
auto vmbr0
iface vmbr0 inet static
    address 192.168.10.250/24
    gateway 192.168.10.254
    bridge-ports eno1
    bridge-stp off
    bridge-fd 0
    bridge-vlan-aware yes
    bridge-vids 2-4094

# Pont Virtuel Interne Isolé (vmbr1) : Sans carte physique rattachée (Réseau privé / DMZ)
auto vmbr1
iface vmbr1 inet static
    address 10.0.0.254/24
    bridge-ports none
    bridge-stp off
    bridge-fd 0
```

### Directives fondamentales :
- `bridge-ports eno1` : Associe l'interface physique au pont virtuel pour relier les VMs au réseau extérieur.
- `bridge-ports none` : Crée un commutateur virtuel totalement isolé à l'intérieur du serveur (idéal pour les DMZ ou travaux pratiques isolés).
- `bridge-vlan-aware yes` : Permet au pont de véhiculer nativement les trames taguées **VLAN 802.1Q**.

---

## 3. Segmentation par VLANs des Machines Virtuelles

Pour affecter une machine virtuelle à un sous-réseau segmenté (ex: VLAN 20 Compta, VLAN 30 R&D) :

### 3.1. Méthode Moderne : Tag VLAN au niveau de la carte virtuelle (`VLAN Tag`)
Sur la configuration de la VM (`/etc/pve/qemu-server/100.conf`) :
```text
net0: virtio=AA:BB:CC:DD:EE:01,bridge=vmbr0,tag=20
```
- L'hyperviseur encapsule automatiquement le trafic sortant de la VM avec l'en-tête 802.1Q VLAN ID 20.
- Les trames arrivant taguées en VLAN 20 sont transmises à la VM sans tag.

### 3.2. Méthode Traditionnelle : Sous-interface de pont (`vmbr0.20`)
```text
auto vmbr0.20
iface vmbr0.20 inet static
    address 192.168.20.250/24
```

---

## 4. Agrégation de Liens (Bonds / LACP IEEE 802.3ad)

Pour doubler la bande passante et assurer la tolérance de panne (redondance en cas de coupure d'un câble ou d'un port switch) :

```text
# Configuration d'un Bond LACP agrégeant les deux cartes physiques eno1 et eno2
auto bond0
iface bond0 inet manual
    bond-slaves eno1 eno2
    bond-miimon 100
    bond-mode 802.3ad
    bond-xmit-hash-policy layer2+3

# Raccordement du pont virtuel au Bond
auto vmbr0
iface vmbr0 inet static
    address 192.168.10.250/24
    gateway 192.168.10.254
    bridge-ports bond0
    bridge-stp off
    bridge-fd 0
```

---

## 5. Application et Rechargement Réseau sans Coupure

Sous Proxmox VE, utilisez la commande `ifreload` (fournie par le paquet `ifupdown2`) pour appliquer les modifications de configuration réseau sans redémarrer le serveur :

```bash
# Vérifier la syntaxe et simuler l'application
ifreload -a -d

# Appliquer immédiatement les nouveaux ponts et adresses IP
ifreload -a
```
