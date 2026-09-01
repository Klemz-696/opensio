---
slug: ipv6-essentiels
title: "IPv6 : structure, types d'adresses et mécanismes d'autoconfiguration"
version: 1.0.0
last_reviewed: "2026-08-25"
difficulty: 2
estimated_minutes: 50
objectives:
  - "Comprendre les motivations du passage à IPv6 et ses avantages majeurs"
  - "Maîtriser la notation hexadécimale, la compression et la syntaxe CIDR IPv6"
  - "Distinguer les types d'adresses IPv6 (GUA, ULA, Link-Local, Multicast, Loopback)"
  - "Comprendre le fonctionnement de l'autoconfiguration SLAAC, EUI-64 et de DHCPv6"
  - "Analyser le rôle du protocole NDP (Neighbor Discovery Protocol) remplaçant ARP"
  - "Manipuler les commandes de diagnostic IPv6 sous Linux et Windows"
prerequisites:
  - "modeles-osi-tcpip"
competency_refs:
  - "B2.1"
  - "B2.2"
success_criteria:
  - "Réussir le quiz 'IPv6 Essentiels' avec au moins 80 %"
labs: []
references:
  - label: "RFC 8200 — Internet Protocol, Version 6 (IPv6) Specification"
    url: "https://www.rfc-editor.org/rfc/rfc8200"
  - label: "RFC 4291 — IP Version 6 Addressing Architecture"
    url: "https://www.rfc-editor.org/rfc/rfc4291"
  - label: "RFC 4861 — Neighbor Discovery for IP version 6 (IPv6)"
    url: "https://www.rfc-editor.org/rfc/rfc4861"
---

# IPv6 : Structure, Adressage et Autoconfiguration

Le protocole IPv6 a été conçu pour résoudre définitivement la pénurie d'adresses IPv4. Au-delà d'un espace d'adressage quasi-illimité, IPv6 apporte des simplifications majeures d'en-tête, l'abandon du broadcast au profit du multicast, et des mécanismes natifs d'autoconfiguration et de sécurité.

---

## 1. Structure et Règles d'Écriture d'une Adresse IPv6

Une adresse IPv6 est codée sur **128 bits** (contre 32 bits en IPv4), soit environ $3{,}4 \times 10^{38}$ adresses uniques.

Elle est représentée sous forme de **8 groupes de 4 chiffres hexadécimaux** (appelés _hextets_ ou _mots de 16 bits_), séparés par des deux-points (`:`) :

```text
2001:0db8:0000:0042:0000:0000:0000:0001
```

### Deux règles strictes de simplification d'écriture :

1. **Suppression des zéros non significatifs à gauche** dans chaque hextet :
   - `0db8` devient `db8`
   - `0042` devient `42`
   - `0000` devient `0`
   - Résultat intermédiaire : `2001:db8:0:42:0:0:0:1`

2. **Compression de la plus longue suite de hextets consécutifs à zéro par un double deux-points (`::`)** :
   - Cette compression ne peut être appliquée **qu'une seule fois** par adresse afin d'éviter toute ambiguïté sur le nombre de zéros omis.
   - Résultat final optimisé : `2001:db8:0:42::1`

---

## 2. Découpage Réseau / Interface (Préfixe CIDR)

Une adresse IPv6 Unicast est conventionnellement découpée en deux moitiés égales de 64 bits :
- **Préfixe réseau (64 bits)** : identifie le réseau global et le sous-réseau local.
- **Identifiant d'interface (Interface ID - 64 bits)** : identifie l'hôte sur ce sous-réseau.

```text
|<----------------- 64 bits ----------------->|<----------------- 64 bits ----------------->|
+---------------------+-----------------------+-----------------------------------------------+
|  Préfixe de routage | ID de sous-réseau     |            Identifiant d'interface            |
|       global        |       (Subnet ID)     |                 (Interface ID)                |
+---------------------+-----------------------+-----------------------------------------------+
```

---

## 3. Typologie des Adresses IPv6

| Type d'adresse | Préfixe binaire / Plage | Portée (Scope) | Description et Usage |
|---|---|---|---|
| **Global Unicast (GUA)** | `2000::/3` (`2000::` à `3fff::`) | Globale (Internet) | Adresse publique routable mondialement (équivalent IPv4 public). |
| **Unique Local (ULA)** | `fc00::/7` (souvent `fd00::/8`) | Locale (Site / Entreprise) | Adresse privée non routable sur Internet (équivalent RFC 1918). |
| **Link-Local** | `fe80::/10` (`fe80::` à `febf::`) | Lien local (Segment L2) | Obligatoire sur chaque interface active, non routable au-delà du commutateur local. Utilisée pour le routage et NDP. |
| **Bouclage (Loopback)** | `::1/128` | Machine locale | Équivalent de `127.0.0.1`. |
| **Non spécifiée** | `::/128` | Hôte | Utilisée comme adresse source temporaire lors de l'initialisation. |
| **Multicast** | `ff00::/8` | Variable (Lien, Site, Global) | Diffusion à un groupe d'hôtes abonnés. Remplace intégralement le broadcast. |

### Adresses Multicast Fréquentes :
- `ff02::1` : Tous les nœuds du lien local (_All Nodes_ — équivalent broadcast).
- `ff02::2` : Tous les routeurs du lien local (_All Routers_).
- `ff02::1:2` : Tous les agents relais DHCPv6.

---

## 4. Mécanismes d'Attribution d'Adresses IPv6

### 4.1. SLAAC (Stateless Address Autoconfiguration)
SLAAC permet à un équipement de s'auto-attribuer une adresse IPv6 globale sans aucun serveur DHCP :
1. Le client envoie un message ICMPv6 **RS** (_Router Solicitation_) à l'adresse multicast `ff02::2`.
2. Le routeur local répond par un message ICMPv6 **RA** (_Router Advertisement_) contenant le préfixe réseau `/64` et les passerelles disponibles.
3. Le client combine le préfixe réseau reçu avec son propre identifiant d'interface de 64 bits.

### 4.2. Génération de l'Identifiant d'Interface (EUI-64 vs Adresses Temporaires)
- **Format EUI-64** : Dérivé de l'adresse MAC (48 bits) :
  1. Séparation de la MAC en 2 blocs de 24 bits (ex : `00:1A:2B` et `3C:4D:5E`).
  2. Insertion du mot hexadécimal `FF:FE` au centre (`00:1A:2B:FF:FE:3C:4D:5E`).
  3. Inversion du 7e bit du premier octet (bit Universel/Local : `00` en binaire `00000000` $\rightarrow$ `00000010` soit `02`).
  4. Résultat : `021a:2bff:fe3c:4d5e`.
- **Adresses Privées Temporaires (RFC 4941)** : Génération pseudo-aléatoire périodique pour empêcher le traçage des équipements sur Internet.

### 4.3. DHCPv6
- **DHCPv6 sans état (_Stateless_)** : SLAAC fournit l'adresse IP et la passerelle ; le serveur DHCPv6 ne distribue que des paramètres annexes (serveurs DNS, domaine).
- **DHCPv6 avec état (_Stateful_)** : Le serveur DHCPv6 gère et consigne l'attribution complète des baux d'adresses (similaire à IPv4).

---

## 5. Le Protocole NDP (Neighbor Discovery Protocol)

NDP fonctionne au-dessus d'ICMPv6 et remplace avantageusement le protocole ARP d'IPv4 :
- **Neighbor Solicitation (NS)** / **Neighbor Advertisement (NA)** : Résolution de l'adresse MAC associée à une adresse IPv6 cible (équivalent des requêtes/réponses ARP).
- **DAD (Duplicate Address Detection)** : Avant d'activer une nouvelle adresse IPv6, l'hôte émet un NS vers sa propre adresse pour s'assurer qu'aucun autre équipement ne l'utilise déjà.

---

## 6. Commandes de Diagnostic IPv6

### Sous Linux :

```bash
# Afficher les adresses IPv6 configurées (GUA et Link-Local)
ip -6 addr show

# Tester la joignabilité d'un hôte IPv6
ping -6 2001:4860:4860::8888

# Ping sur une adresse Link-Local (l'interface de sortie '%eth0' est obligatoire)
ping -6 fe80::1%eth0

# Afficher la table des voisins NDP (équivalent de 'ip neigh' / 'arp -n')
ip -6 neigh show

# Afficher la table de routage IPv6
ip -6 route show
```

### Sous Windows :

```powershell
# Afficher la configuration réseau IPv6
Get-NetIPAddress -AddressFamily IPv6 | Format-Table IPAddress, InterfaceAlias, PrefixLength

# Tester la connectivité IPv6
Test-Connection -TargetName 2001:4860:4860::8888 -IPv6

# Afficher la table de voisinage IPv6
Get-NetNeighbor -AddressFamily IPv6
```
