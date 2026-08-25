---
slug: routage-statique
title: "Routage statique : fonctionnement, tables de routage et interconnexion"
version: 1.0.0
last_reviewed: "2026-08-25"
difficulty: 3
estimated_minutes: 55
objectives:
  - "Comprendre le rôle du routeur et les mécanismes de décision d'acheminement de paquets"
  - "Lire, analyser et interpréter une table de routage IPv4 sous Linux et Cisco IOS"
  - "Maîtriser la règle de correspondance du plus long préfixe (Longest Prefix Match)"
  - "Configurer des routes statiques standards, des routes par défaut et des routes flottantes"
  - "Mettre en œuvre le routage inter-VLAN (Router-on-a-Stick et interfaces SVI sur Switch L3)"
  - "Diagnostiquer les pannes de routage classiques (asymétrie, absence de route de retour)"
prerequisites:
  - "modeles-osi-tcpip"
  - "subnetting-vlsm"
  - "vlan-segmentation"
competency_refs:
  - "B2.1"
  - "B2.2"
success_criteria:
  - "Réussir le quiz 'Routage Statique' avec au moins 80 %"
labs: []
references:
  - label: "RFC 1812 — Requirements for IP Version 4 Routers"
    url: "https://www.rfc-editor.org/rfc/rfc1812"
  - label: "Guide Cisco — Configuring Static and Default Routes"
    url: "https://www.cisco.com/c/en/us/support/docs/ip/ip-routing/10700-10.html"
---

# Routage Statique : Fonctionnement, Tables de Routage et Interconnexion

Le **routage** est le processus fondamental par lequel un équipement de couche 3 (routeur, passerelle ou commutateur de niveau 3) sélectionne le chemin optimal pour acheminer un paquet IP depuis son réseau d'origine vers son réseau de destination. En environnement d'entreprise, le **routage statique** offre un contrôle total, une sécurité maximale et une absence totale de consommation de bande passante par des protocoles dynamiques.

---

## 1. Processus de Décision du Routeur et Longest Prefix Match

Lorsqu'un routeur reçoit un paquet IP sur l'une de ses interfaces :
1. Il extrait l'**adresse IP de destination** contenue dans l'en-tête du paquet.
2. Il consulte sa **table de routage** pour trouver toutes les entrées correspondant à cette destination.
3. **Règle du plus long préfixe (_Longest Prefix Match_)** : Si plusieurs routes correspondent, le routeur choisit obligatoirement la route dont le **masque de sous-réseau est le plus spécifique** (préfixe CIDR le plus élevé).

### Exemple de décision :
Pour un paquet à destination de `10.20.1.50` :
- Route A : `10.0.0.0/8` via Passerelle 1
- Route B : `10.20.0.0/16` via Passerelle 2
- Route C : `10.20.1.0/24` via Passerelle 3

Le routeur choisira la **Route C (`/24`)** car son préfixe (24 bits) est le plus long et le plus précis.

---

## 2. Structure d'une Table de Routage

Une table de routage contient les informations suivantes pour chaque destination connue :
- **Réseau cible et masque** (ex : `192.168.20.0/24`).
- **Passerelle suivante (_Next-Hop_)** : L'adresse IP de l'interface du routeur voisin auquel remettre le paquet.
- **Interface de sortie** : Le port local par lequel expédier le paquet (ex : `GigabitEthernet0/0` ou `eth0`).
- **Distance administrative (DA)** : Indice de confiance de la source de routage (0 = connectée, 1 = statique, 90 = EIGRP, 110 = OSPF, 120 = RIP).
- **Métrique** : Coût du chemin vers la destination.

---

## 3. Typologie des Routes Statiques

### 3.1. Route statique standard
Cible un réseau spécifique :
```text
# Cisco IOS : ip route <réseau-cible> <masque> <ip-next-hop>
Router(config)# ip route 192.168.20.0 255.255.255.0 10.0.0.2
```

### 3.2. Route par défaut (_Default Route / Gateway of Last Resort_)
Indique le chemin à emprunter pour toutes les destinations inconnues (`0.0.0.0/0` en IPv4 ou `::/0` en IPv6) :
```text
Router(config)# ip route 0.0.0.0 0.0.0.0 192.0.2.1
```

### 3.3. Route flottante (_Floating Static Route_)
Route de secours configurée avec une distance administrative supérieure à la route principale (ex : 200 au lieu de 1). Elle reste inactive dans la table tant que la liaison principale est opérationnelle et prend le relais immédiatement en cas de panne.
```text
Router(config)# ip route 0.0.0.0 0.0.0.0 198.51.100.1 200
```

---

## 4. Routage Inter-VLAN

Par conception, les VLANs isolent les flux au niveau 2. Pour faire communiquer deux VLANs, deux architectures principales sont déployées :

### 4.1. Méthode « Router-on-a-Stick » (RoaS)
Une seule interface physique de routeur est raccordée à un port trunk du commutateur. L'interface physique est scindée en **sous-interfaces virtuelles** (une par VLAN) :

```text
       +---------------+
       |    Routeur    |
       |  G0/0.10 (.1) |
       |  G0/0.20 (.1) |
       +-------+-------+
               |  (Liaison Trunk 802.1Q)
       +-------+-------+
       |  Switch L2    |
       +---+-------+---+
           |       |
     [VLAN 10]   [VLAN 20]
```

#### Configuration Cisco IOS (Router-on-a-Stick) :
```text
Router(config)# interface gigabitEthernet 0/0
Router(config-if)# no shutdown
Router(config-if)# exit

# Sous-interface pour le VLAN 10
Router(config)# interface gigabitEthernet 0/0.10
Router(config-subif)# encapsulation dot1Q 10
Router(config-subif)# ip address 192.168.10.1 255.255.255.0
Router(config-subif)# exit

# Sous-interface pour le VLAN 20
Router(config)# interface gigabitEthernet 0/0.20
Router(config-subif)# encapsulation dot1Q 20
Router(config-subif)# ip address 192.168.20.1 255.255.255.0
Router(config-subif)# exit
```

### 4.2. Routage sur Commutateur de Niveau 3 (Switch L3 via SVI)
Le routage est assuré directement à la vitesse du silicium (ASIC) au sein du commutateur via des **interfaces virtuelles de commutation** (_SVI — Switch Virtual Interfaces_) :

```text
SwitchL3(config)# ip routing

# SVI VLAN 10
SwitchL3(config)# interface vlan 10
SwitchL3(config-if)# ip address 192.168.10.1 255.255.255.0
SwitchL3(config-if)# no shutdown
SwitchL3(config-if)# exit

# SVI VLAN 20
SwitchL3(config)# interface vlan 20
SwitchL3(config-if)# ip address 192.168.20.1 255.255.255.0
SwitchL3(config-if)# no shutdown
SwitchL3(config-if)# exit
```

---

## 5. Commandes de Diagnostic de Routage

### Sous Linux (Debian) :
```bash
# Afficher la table de routage courante
ip route show

# Ajouter une route statique vers un sous-réseau
ip route add 192.168.30.0/24 via 10.0.0.2 dev eth0

# Ajouter une passerelle par défaut
ip route add default via 192.168.1.254

# Tester le chemin complet emprunté par les paquets
traceroute -n 192.168.30.10
```

### Sous Cisco IOS :
```text
# Afficher la table de routage complète
Router# show ip route

# Filtrer les routes statiques uniquement
Router# show ip route static

# Tester la connectivité et la résolution du prochain saut
Router# ping 192.168.20.1
Router# traceroute 192.168.20.1
```

---

## 6. Diagnostic de Pannes Classiques en Routage

> ⚠️ **Le piège fondamental de la route de retour** :
> Un paquet peut parfaitement atteindre sa destination (ex : de R1 vers R2), mais si le routeur de destination ou la machine réceptrice ne dispose pas d'une route pour renvoyer le paquet vers le réseau source d'origine, le paquet de retour sera détruit et le `ping` échouera en `Request Timed Out`. **Toujours vérifier les routes aller ET les routes retour.**
