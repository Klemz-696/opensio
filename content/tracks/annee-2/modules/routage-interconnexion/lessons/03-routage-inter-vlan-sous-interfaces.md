---
slug: routage-inter-vlan-sous-interfaces
title: "Routage Inter-VLAN : Router-on-a-Stick, 802.1Q et Switchs Niveau 3 (SVI)"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 3
estimated_minutes: 50
objectives:
  - "Comprendre la nécessité du routage de couche 3 entre des domaines de diffusion VLAN isolés"
  - "Configurer une architecture Router-on-a-Stick (RoaS) avec sous-interfaces et encapsulation 802.1Q"
  - "Déployer le routage inter-VLAN sur commutateur de niveau 3 (Switch L3) via les interfaces virtuelles SVI"
  - "Comparer les performances, limites de bande passante et cas d'usage entre RoaS et SVI"
  - "Diagnostiquer les pannes fréquentes de passerelle par défaut et de liaisons Trunk"
prerequisites:
  - "reseaux-fondamentaux"
  - "principes-routage-statique-dynamique"
competency_refs:
  - "B2.1"
  - "B2.2"
success_criteria:
  - "Réussir le quiz 'Routage Inter-VLAN' avec au moins 80 %"
labs:
  - slug: configuration-routage-inter-vlan
    required: true
references:
  - label: "Cisco — Configuring InterVLAN Routing"
    url: "https://www.cisco.com/c/en/us/support/docs/lan-switching/inter-vlan-routing/41860-howto-L3-interVLANrouting.html"
  - label: "IEEE 802.1Q Standard Overview"
    url: "https://standards.ieee.org/ieee/802.1Q/10323/"
---

# Routage Inter-VLAN : Router-on-a-Stick, 802.1Q et Switchs Niveau 3 (SVI)

Les **VLANs** (_Virtual Local Area Networks_) scindent un réseau commuté en plusieurs domaines de diffusion indépendants au niveau de la couche 2 (Liaison). Par définition, des équipements situés dans des VLANs différents ne peuvent pas communiquer directement sans l'intervention d'un équipement de couche 3 pour router les paquets.

---

## 1. Architecture Router-on-a-Stick (RoaS)

L'architecture **Router-on-a-Stick** permet de router le trafic de dizaines de VLANs à travers une **unique liaison physique** (câble Ethernet) raccordant le routeur au commutateur :

```text
       ┌───────────────┐
       │ Routeur (RoaS)│
       │   G0/0/0      │ (Liaison Trunk 802.1Q)
       └───────┬───────┘
               │ Sub-interfaces:
               │  • g0/0/0.10 (IP 192.168.10.254/24 - VLAN 10)
               │  • g0/0/0.20 (IP 192.168.20.254/24 - VLAN 20)
               │  • g0/0/0.30 (IP 192.168.30.254/24 - VLAN 30)
       ┌───────┴───────┐
       │ Commutateur L2│ (Switchport Mode Trunk)
       └───┬───────┬───┘
           │       │
    (VLAN 10)   (VLAN 20)
       ┌───┴───┐ ┌───┴───┐
       │ PC-10 │ │ PC-20 │
       └───────┘ └───────┘
```

### Configuration Cisco IOS d'un Routeur RoaS :
```text
Router(config)# interface GigabitEthernet0/0/0
Router(config-if)# no ip address
Router(config-if)# no shutdown
!
Router(config)# interface GigabitEthernet0/0/0.10
Router(config-subif)# description Passerelle VLAN 10 Administration
Router(config-subif)# encapsulation dot1Q 10
Router(config-subif)# ip address 192.168.10.254 255.255.255.0
!
Router(config)# interface GigabitEthernet0/0/0.20
Router(config-subif)# description Passerelle VLAN 20 Production
Router(config-subif)# encapsulation dot1Q 20
Router(config-subif)# ip address 192.168.20.254 255.255.255.0
```

> [!WARNING]
> La commande `encapsulation dot1Q <vlan-id>` doit **toujours** être exécutée avant d'attribuer l'adresse IP sur la sous-interface, sous peine de refus par le système d'exploitation du routeur.

---

## 2. Routage sur Commutateur de Niveau 3 (SVI)

Dans les cœurs de réseau de campus ou datacenters, le modèle RoaS souffre d'un goulot d'étranglement sur le lien physique unique. On utilise alors un **commutateur multicouche (Switch L3)** : le routage est assuré en matériel (_ASIC/TCAM_) à la vitesse du bus interne (_wire-speed_).

Les passerelles par défaut des VLANs sont des interfaces logiques internes appelées **SVI** (_Switch Virtual Interfaces_) :

```text
Switch-L3(config)# ip routing                      ! Active le moteur de routage IPv4
!
Switch-L3(config)# vlan 10
Switch-L3(config-vlan)# name Admin
Switch-L3(config)# vlan 20
Switch-L3(config-vlan)# name Production
!
Switch-L3(config)# interface Vlan 10               ! Création de la SVI 10
Switch-L3(config-if)# ip address 192.168.10.254 255.255.255.0
Switch-L3(config-if)# no shutdown
!
Switch-L3(config)# interface Vlan 20               ! Création de la SVI 20
Switch-L3(config-if)# ip address 192.168.20.254 255.255.255.0
Switch-L3(config-if)# no shutdown
```

---

## 3. Comparatif Technique : RoaS vs SVI L3

| Critère | Router-on-a-Stick (RoaS) | Commutateur L3 (SVI) |
|---|---|---|
| **Matériel requis** | 1 Routeur standard + 1 Switch L2 | 1 Commutateur L3 (ex: Cisco Catalyst 3850/9300) |
| **Performance** | Limitée par la bande passante du port physique (1 Gbps partagé) | Vitesse filaire (_Wire-speed_), plusieurs dizaines de Gbps |
| **Latence** | Aller-retour physique sur le câble Trunk | Quasi-nulle (commutation matérielle interne) |
| **Fonctionnalités avancées** | NAT complexe, VPN IPsec, Firewall étendu, QoS fine | Filtrage par ACL L3/L4, routage dynamique OSPF/EIGRP |
| **Cas d'usage typique** | PME, agences distantes, routeur d'accès Internet | Cœur et distribution de réseau d'entreprise, Datacenter |
