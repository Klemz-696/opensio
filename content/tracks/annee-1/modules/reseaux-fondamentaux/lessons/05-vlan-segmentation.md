---
slug: vlan-segmentation
title: "VLAN et segmentation réseau : isolation de niveau 2 et trunk 802.1Q"
version: 1.0.0
last_reviewed: "2026-08-25"
difficulty: 3
estimated_minutes: 55
objectives:
  - "Comprendre le concept de VLAN et l'isolation des domaines de diffusion (Broadcast Domains)"
  - "Distinguer le fonctionnement d'un port d'accès (Access) et d'un port d'agrégation (Trunk)"
  - "Maîtriser la structure du tag d'encapsulation IEEE 802.1Q"
  - "Comprendre le rôle et les risques de sécurité liés au VLAN natif"
  - "Configurer des VLANs, affecter des ports et établir un trunk sous Cisco IOS"
  - "Appliquer les bonnes pratiques de sécurité et de durcissement des commutateurs"
prerequisites:
  - "modeles-osi-tcpip"
competency_refs:
  - "B2.1"
  - "B2.2"
success_criteria:
  - "Réussir le quiz 'VLAN et Segmentation' avec au moins 80 %"
  - "Compléter l'atelier pratique 'Configuration VLAN sur switch'"
labs:
  - slug: config-vlan-switch
    required: true
references:
  - label: "Norme IEEE 802.1Q — Bridges and Bridged Networks (Virtual LANs)"
    url: "https://standards.ieee.org/ieee/802.1Q/10323/"
  - label: "Guide Cisco — Understanding and Configuring VLANs"
    url: "https://www.cisco.com/c/en/us/support/docs/lan-switching/vlan/10023-3.html"
---

# VLAN et Segmentation Réseau : Isolation Niveau 2 et Agrégation 802.1Q

Dans une infrastructure réseau d'entreprise, regrouper tous les équipements dans un unique domaine de diffusion physique pose des problèmes majeurs de sécurité, de performance et d'administration. Les **VLANs** (_Virtual Local Area Networks_) permettent de scinder un commutateur physique en plusieurs commutateurs virtuels isolés au niveau de la couche 2 (Liaison de données).

---

## 1. Principes et Avantages de la Segmentation par VLAN

Un VLAN constitue un **domaine de diffusion logique indépendant**. Par défaut, deux machines situées sur des VLANs différents ne peuvent pas communiquer directement au niveau 2, même si elles sont raccordées au même commutateur physique. Pour communiquer, le trafic doit obligatoirement transiter par un équipement de niveau 3 (routeur ou commutateur de niveau 3).

```text
               +----------------------------------+
               |       Commutateur Physique       |
               +----------------------------------+
                 /                              \
       (Ports 1 à 12)                    (Ports 13 à 24)
              |                                 |
     [ VLAN 10 - Comptabilité ]          [ VLAN 20 - Invités ]
     Domaine Broadcast 1                 Domaine Broadcast 2
```

### Bénéfices majeurs :
1. **Sécurité accrue** : Confinement des flux sensibles (séparation des postes administratifs, de la production, de la VoIP et des invités).
2. **Réduction du trafic de diffusion** : Les trames de broadcast (ARP, DHCP Discover) sont strictement limitées aux membres du même VLAN.
3. **Flexibilité organisationnelle** : Un utilisateur peut changer de bureau physique tout en restant rattaché à son VLAN logique sans recâblage.

---

## 2. Types de Ports : Access vs Trunk

Sur un commutateur gérable, chaque port physique est configuré selon l'un des deux modes suivants :

### 2.1. Port d'accès (_Access Port_)
- Destiné à raccorder un **équipement terminal** (poste client, imprimante, serveur mono-interface).
- Appartient à **un seul et unique VLAN**.
- **Trafic non tagué** : Le commutateur supprime le tag 802.1Q avant de transmettre la trame à la machine finale. La carte réseau du client n'a pas conscience de l'existence des VLANs.

### 2.2. Port d'agrégation (_Trunk Port_)
- Destiné à interconnecter **deux commutateurs** ou un commutateur à un **routeur**.
- Transporte le trafic de **plusieurs VLANs simultanément** sur une même liaison physique.
- **Trafic tagué** : Le commutateur insère un tag 802.1Q dans chaque trame pour identifier son VLAN d'appartenance lors du transit sur le trunk.

---

## 3. Le Tag d'Encapsulation IEEE 802.1Q

La norme **IEEE 802.1Q** est le standard universel de marquage de trame Ethernet. Un tag de **4 octets (32 bits)** est inséré directement entre l'adresse MAC source et le champ EtherType de la trame d'origine :

```text
+----------+----------+-----------------+-----------+---------------+---------+
| MAC Dest | MAC Src  |   Tag 802.1Q    | EtherType |    Données    | FCS/CRC |
| (6 oct)  | (6 oct)  |    (4 octets)   |  (2 oct)  | (46-1500 oct) | (4 oct) |
+----------+----------+-----------------+-----------+---------------+---------+
                             |
         +-------------------+-------------------+
         | TPID (16 bits)    | TCI (16 bits)     |
         | Valeur: 0x8100    | PCP (3b) | DEI(1) | VID (12 bits) |
         +-------------------+-------------------+---------------+
```

- **TPID (Tag Protocol Identifier - 16 bits)** : Fixé à `0x8100`, indique qu'il s'agit d'une trame taguée 802.1Q.
- **TCI (Tag Control Information - 16 bits)** :
  - **PCP / CoS (Priority Code Point - 3 bits)** : Priorisation de la Qualité de Service (QoS de 0 à 7, utile pour la VoIP).
  - **DEI (Drop Eligible Indicator - 1 bit)** : Indique si la trame peut être éliminée en cas de congestion.
  - **VID (VLAN Identifier - 12 bits)** : Identifiant du VLAN (valeurs de $1$ à $4094$).
    - VLAN 1 : VLAN par défaut (non supprimable).
    - VLANs 2 à 1001 : Plage standard classique.
    - VLANs 1006 à 4094 : Plage étendue (_Extended VLANs_).

---

## 4. Le VLAN Natif (_Native VLAN_)

Sur un trunk 802.1Q, le **VLAN natif** est le seul VLAN dont les trames transitent **sans aucun tag 802.1Q**.

- Par défaut sur le matériel Cisco : **VLAN 1**.
- Si un commutateur reçoit une trame non taguée sur un port trunk, il l'associe automatiquement à son VLAN natif.

> ⚠️ **Règle de sécurité critique** : Les deux extrémités d'une liaison trunk doivent obligatoirement être configurées avec le **même VLAN natif** (sous peine de créer une fuite de trafic entre VLANs différents). Il est fortement recommandé de remplacer le VLAN 1 natif par un VLAN dédié inutilisé (ex : VLAN 999).

---

## 5. Configuration Pratique sous Cisco IOS

### Étape 1 : Créer les VLANs dans la base de données
```text
Switch# configure terminal
Switch(config)# vlan 10
Switch(config-vlan)# name Comptabilite
Switch(config-vlan)# exit

Switch(config)# vlan 20
Switch(config-vlan)# name Commercial
Switch(config-vlan)# exit

Switch(config)# vlan 99
Switch(config-vlan)# name Administration
Switch(config-vlan)# exit
```

### Étape 2 : Affecter des ports d'accès
```text
Switch(config)# interface range fastEthernet 0/1 - 12
Switch(config-if-range)# switchport mode access
Switch(config-if-range)# switchport access vlan 10
Switch(config-if-range)# exit

Switch(config)# interface range fastEthernet 0/13 - 24
Switch(config-if-range)# switchport mode access
Switch(config-if-range)# switchport access vlan 20
Switch(config-if-range)# exit
```

### Étape 3 : Configurer une liaison Trunk vers un autre commutateur
```text
Switch(config)# interface gigabitEthernet 0/1
Switch(config-if)# description Trunk vers SW-Distribution
Switch(config-if)# switchport trunk encapsulation dot1q
Switch(config-if)# switchport mode trunk
Switch(config-if)# switchport trunk native vlan 99
Switch(config-if)# switchport trunk allowed vlan 10,20,99
Switch(config-if)# exit
```

### Étape 4 : Vérification et diagnostic
```text
# Afficher l'état de tous les VLANs et ports associés
Switch# show vlan brief

# Vérifier les interfaces configurées en Trunk et leurs VLANs autorisés
Switch# show interfaces trunk

# Afficher les détails d'un port spécifique
Switch# show interfaces fastEthernet 0/1 switchport
```

---

## 6. Bonnes Pratiques de Durcissement et Sécurité (SISR)

1. **Désactiver la négociation automatique DTP (_Dynamic Trunking Protocol_)** sur les ports d'accès :
   `switchport nonegotiate` (empêche une machine malveillante de simuler un switch pour monter un trunk pirate).
2. **Filtrer strictement les VLANs autorisés sur les trunks** : Utiliser systématiquement `switchport trunk allowed vlan` pour restreindre les flux au strict nécessaire.
3. **Désactiver et isoler les ports inutilisés** : Placer tous les ports vacants dans un VLAN « poubelle » non routé (ex : VLAN 666) et désactiver les interfaces (`shutdown`).
4. **Isoler la gestion (Management)** : Configurer une interface virtuelle de gestion (`interface vlan 99` avec adresse IP) dédiée aux flux SSH/SNMP des administrateurs.
