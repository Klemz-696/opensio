---
slug: supervision-et-diagnostic-routage
title: "Supervision, Commandes de Diagnostic et Dépannage du Routage"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 3
estimated_minutes: 50
objectives:
  - "Analyser la table de routage sur équipements Cisco et Linux (codes C, S, O, O IA, O*E2)"
  - "Superviser les sessions de voisinage OSPF (show ip ospf neighbor, états et timers)"
  - "Diagnostiquer les pannes de connectivité avec ping, traceroute, mtr et tcpdump"
  - "Résoudre les incidents de blocage d'adjacence OSPF (MTU Mismatch en état ExStart)"
  - "Identifier et corriger les boucles de routage (TTL Expired) et le routage asymétrique"
prerequisites:
  - "principes-routage-statique-dynamique"
  - "protocole-ospf-architecture-et-etats"
  - "routage-inter-vlan-sous-interfaces"
competency_refs:
  - "B2.1"
  - "B2.2"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Supervision et Diagnostic du Routage' avec au moins 80 %"
labs: []
references:
  - label: "Cisco — Troubleshooting OSPF Neighbor Adjacencies"
    url: "https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/13684-12.html"
  - label: "Linux ip-route Documentation"
    url: "https://man7.org/linux/man-pages/man8/ip-route.8.html"
---

# Supervision, Commandes de Diagnostic et Dépannage du Routage

L'administration quotidienne d'infrastructures d'interconnexion exige une méthodologie rigoureuse de diagnostic pour localiser rapidement les coupures de service et anomalies de routage.

---

## 1. Lecture Experte de la Table de Routage

Sur un routeur Cisco IOS (`show ip route`) ou une pile Linux FRR (`show ip route`) :

```text
Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area 
       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
       E1 - OSPF external type 1, E2 - OSPF external type 2
       * - candidate default, U - per-user static route

Gateway of last resort is 203.0.113.1 to network 0.0.0.0

O*E2 0.0.0.0/0 [110/1] via 10.0.0.1, 01:14:22, GigabitEthernet0/0
C    10.0.0.0/30 is directly connected, GigabitEthernet0/0
L    10.0.0.2/32 is directly connected, GigabitEthernet0/0
O    192.168.10.0/24 [110/100] via 10.0.0.1, 00:45:10, GigabitEthernet0/0
O IA 192.168.30.0/24 [110/110] via 10.0.0.1, 00:45:10, GigabitEthernet0/0
S    172.16.0.0/16 [1/0] via 10.0.0.5
```

- `[110/100]` : Le premier nombre est la **Distance Administrative** (110 pour OSPF), le second est la **Métrique totale (Coût)** jusqu'à la destination.
- `O IA` : Route OSPF Inter-Area (provenant d'une autre zone que l'Area locale).
- `O*E2` : Route externe OSPF injectée par un ASBR (le coût reste fixe par défaut).

---

## 2. Diagnostic d'Adjacence OSPF

La commande `show ip ospf neighbor` fournit l'état de chaque session :

```text
Neighbor ID     Pri   State           Dead Time   Address         Interface
192.168.100.1     1   FULL/DR         00:00:34    10.0.0.1        GigabitEthernet0/0
192.168.100.2     1   FULL/BDR        00:00:38    10.0.0.5        GigabitEthernet0/1
```

### Principaux états et causes d'anomalies :
1. **Bloqué en état INIT** : Le routeur distant ne reçoit pas les paquets Hello locaux (problème de pare-feu, ACL bloquant le multicast `224.0.0.5` ou câble unidirectionnel).
2. **Bloqué en état 2-WAY** : Normal entre deux routeurs DROther sur un réseau broadcast partagé.
3. **Bloqué en état EXSTART / EXCHANGE** : **MTU Mismatch !** Les deux routeurs ont une taille de MTU différente sur leurs interfaces connectées. Les paquets DBD volumineux sont rejetés.
   - *Solution : Aligner les MTU ou exécuter `ip ospf mtu-ignore` sous l'interface.*

---

## 3. Détection des Boucles de Routage et Asymétrie

```mermaid
sequenceDiagram
    autonumber
    participant Client as PC-Client (10.1.1.10)
    participant R1 as Routeur R1 (TTL=64)
    participant R2 as Routeur R2 (TTL=63)
    participant Target as Serveur Web (10.2.2.50)

    Client->>R1: Paquet IP (TTL=64)
    R1->>R2: Route vers 10.2.2.0/24 via R2 (TTL=63)
    R2->>R1: Erreur de routage : renvoie à R1 ! (TTL=62)
    R1->>R2: Renvoie à R2 (TTL=61)
    Note over R1,R2: Boucle de routage (Loop) jusqu'à décrémentation totale
    R2-->>Client: ICMP Type 11 (TTL expired in transit)
```

- **Boucle de routage (_Routing Loop_)** : Si deux routeurs se renvoient mutuellement un paquet, le champ TTL évite que le paquet ne sature le réseau indéfiniment. `traceroute` affiche une répétition infinie d'adresses IP identiques.
- **Routage Asymétrique** : Le trafic part par le lien A et revient par le lien B. Si un pare-feu à inspection d'état (_Stateful Inspection_) est placé sur le chemin sans voir le paquet SYN initial, il détruira les paquets de retour (_Connection Reset / Drop_).
