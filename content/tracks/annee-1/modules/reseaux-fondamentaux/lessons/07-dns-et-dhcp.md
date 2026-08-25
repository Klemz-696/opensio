---
slug: dns-et-dhcp
title: "DNS et DHCP : principes, architecture et services d'infrastructure"
version: 1.0.0
last_reviewed: "2026-08-25"
difficulty: 2
estimated_minutes: 55
objectives:
  - "Comprendre l'architecture hiérarchique et le mécanisme de résolution récursif/itératif du DNS"
  - "Identifier les principaux types d'enregistrements DNS (A, AAAA, CNAME, MX, PTR, NS, SOA)"
  - "Maîtriser les 4 phases du protocole DHCP (processus DORA) et la gestion des baux"
  - "Configurer les options DHCP indispensables (passerelle, DNS, nom de domaine)"
  - "Comprendre le rôle et la configuration d'un agent de relais DHCP (IP Helper)"
  - "Diagnostiquer les pannes de résolution et d'attribution IP avec dig, nslookup et tcpdump"
prerequisites:
  - "modeles-osi-tcpip"
  - "routage-statique"
competency_refs:
  - "B2.1"
  - "B2.2"
success_criteria:
  - "Réussir le quiz 'DNS et DHCP' avec au moins 80 %"
  - "Compléter l'atelier pratique 'Maquette DNS/DHCP'"
labs:
  - slug: maquette-dns-dhcp
    required: true
references:
  - label: "RFC 1034 — Domain Names - Concepts and Facilities"
    url: "https://www.rfc-editor.org/rfc/rfc1034"
  - label: "RFC 1035 — Domain Names - Implementation and Specification"
    url: "https://www.rfc-editor.org/rfc/rfc1035"
  - label: "RFC 2131 — Dynamic Host Configuration Protocol"
    url: "https://www.rfc-editor.org/rfc/rfc2131"
---

# DNS et DHCP : Principes, Architecture et Services Réseau Fondamentaux

Les services **DNS** (_Domain Name System_) et **DHCP** (_Dynamic Host Configuration Protocol_) constituent les deux piliers de l'infrastructure réseau TCP/IP. Sans eux, la configuration manuelle de chaque hôte et la navigation par adresses IP numériques rendraient l'exploitation d'un parc informatique ingérable.

---

## 1. Le Service DNS (Domain Name System)

Le DNS (port standard **53 UDP** pour les requêtes courantes, **53 TCP** pour les transferts de zone volumineux) est une base de données distribuée et hiérarchique assurant la translation entre noms de domaine conviviaux (ex : `srv-web.opensio.lan`) et adresses IP numériques (`192.168.10.50`).

### 1.1. Arborescence Hiérarchique du DNS
L'espace de noms DNS est structuré comme un arbre inversé :

```text
                           . (Racine - Root)
                      /           |          \
                 .fr             .com        .lan (TLD - Top Level Domain)
                 /                |
            opensio             google       (Domaines de second niveau)
             /    \
         srv-app  srv-mail                   (Sous-domaines / Hôtes)
```

1. **La Racine (`.`)** : Servie par 13 identités de serveurs racines mondiaux (de `a.root-servers.net` à `m.root-servers.net`), répliquées par Anycast.
2. **Les Domaines de Premier Niveau (TLD)** : Génériques (`.com`, `.org`) ou nationaux (`.fr`, `.eu`).
3. **Les Domaines de Second Niveau** : Déposés par les organisations (ex : `opensio.fr`).
4. **Les Hôtes / FQDN (Fully Qualified Domain Name)** : Nom complet non ambigu se terminant par un point racine (ex : `srv-web.opensio.lan.`).

### 1.2. Types de Serveurs et Processus de Résolution
- **Résolveur récursif (Recursive Resolver)** : Serveur DNS (fourni par le FAI ou l'entreprise) interrogé par les postes clients. Il prend en charge l'ensemble de la recherche pour le compte du client.
- **Serveur autoritaire (Authoritative Name Server)** : Détient les fichiers de zone officiels d'un domaine donné et fournit des réponses faisant autorité.

```text
[Client] ---> 1. Requête Récursive ("Quel est l'IP de www.exemple.fr ?") ---> [Résolveur Local]
                                                                                |
      +-------------------------------------------------------------------------+
      |---> 2. Requête Itérative vers Serveur Racine (.) ---------> Réponse : "Voir le TLD .fr"
      |---> 3. Requête Itérative vers Serveur TLD (.fr) ----------> Réponse : "Voir NS de exemple.fr"
      |---> 4. Requête Itérative vers Serveur Autoritaire ------> Réponse : "www = 198.51.100.10"
      |
[Client] <--- 5. Réponse finale mise en cache <---------------------------------+
```

### 1.3. Principaux Enregistrements de Zone (Resource Records - RR)

| Type | Nom complet | Rôle et Exemple |
|---|---|---|
| **A** | Address IPv4 | Associe un nom d'hôte à une IPv4 : `srv1.lan. IN A 192.168.10.10` |
| **AAAA** | Address IPv6 | Associe un nom d'hôte à une IPv6 : `srv1.lan. IN AAAA 2001:db8::10` |
| **CNAME** | Canonical Name | Alias vers un autre nom d'hôte canonique : `www.lan. IN CNAME srv1.lan.` |
| **MX** | Mail Exchanger | Pointeur vers le serveur de messagerie avec priorité : `lan. IN MX 10 mail.lan.` |
| **PTR** | Pointer | Résolution inverse (IP $\rightarrow$ Nom FQDN) dans la zone `in-addr.arpa.` |
| **NS** | Name Server | Délègue l'autorité de la zone à un serveur DNS : `lan. IN NS ns1.lan.` |
| **SOA** | Start of Authority | En-tête obligatoire de zone : numéro de série, email de contact, TTL, timers d'expiration. |

---

## 2. Le Service DHCP (Dynamic Host Configuration Protocol)

DHCP (ports UDP **67 serveur** / **68 client**) automatise l'attribution dynamique des paramètres IP aux clients du réseau local.

### 2.1. Le Processus DORA (Émission de Bail)

Le cycle d'obtention d'une adresse IP se déroule en 4 étapes :

```text
[Client DHCP]                                               [Serveur DHCP]
      |                                                            |
      | -------- 1. DHCP DISCOVER (Broadcast 255.255.255.255) ----> | (Qui a une IP pour moi ?)
      |                                                            |
      | <------- 2. DHCP OFFER (Unicast ou Broadcast) ------------ | (Je te propose 192.168.1.50)
      |                                                            |
      | -------- 3. DHCP REQUEST (Broadcast) --------------------> | (J'accepte 192.168.1.50)
      |                                                            |
      | <------- 4. DHCP ACK (Unicast / Acknowledge) ------------- | (Bail confirmé pour 8 jours)
      |                                                            |
```

1. **Discover** : Le client sans IP émet un broadcast (`0.0.0.0:68` vers `255.255.255.255:67`) contenant son adresse MAC.
2. **Offer** : Le ou les serveurs DHCP du réseau proposent une adresse IP disponible avec un masque et une durée de bail.
3. **Request** : Le client sélectionne une offre et informe publiquement l'ensemble des serveurs du réseau de son choix.
4. **Acknowledge (ACK)** : Le serveur retenu valide le bail, enregistre l'allocation et transmet les options réseau configurées.

### 2.2. Options DHCP Fondamentales

| N° Option | Nom de l'option | Description | Exemple |
|---|---|---|---|
| **Option 3** | Router | Adresse IP de la passerelle par défaut | `192.168.1.254` |
| **Option 6** | Domain Name Server | Liste ordonnée des serveurs DNS | `192.168.1.10, 1.1.1.1` |
| **Option 15** | Domain Name | Suffixe DNS principal attribué aux machines | `entreprise.local` |
| **Option 42** | NTP Servers | Serveurs d'horloge réseau pour synchronisation | `192.168.1.1` |

### 2.3. Cycle de Vie du Bail et Renouvellement
- **T1 (50 % du bail)** : Le client tente un renouvellement automatique en Unicast direct auprès du serveur d'origine (`DHCPREQUEST`).
- **T2 (87.5 % du bail)** : En cas d'échec à T1, le client émet un `DHCPREQUEST` en Broadcast pour tenter d'obtenir un bail auprès de n'importe quel autre serveur disponible.
- **Expiration (100 %)** : L'adresse IP est immédiatement libérée et le client repasse en recherche initiale (ou bascule en adresse automatique **APIPA** `169.254.x.x` sous Windows).

---

## 3. Le Relais DHCP (DHCP Relay / IP Helper-Address)

Les trames `DHCPDISCOVER` étant émises en **Broadcast**, elles sont bloquées par défaut par les routeurs (qui ne routent jamais le broadcast).

Pour éviter d'installer un serveur DHCP physique sur chaque sous-réseau / VLAN, on configure un **Agent de Relais DHCP** sur l'interface du routeur ou du commutateur de niveau 3 :

```text
[Client VLAN 10] ---> Broadcast DHCP ---> [Routeur / IP Helper] ---> Unicast UDP 67 ---> [Serveur DHCP Central]
                                          (Convertit 255.255.255.255 en 192.168.100.10)
```

### Configuration Cisco IOS :
```text
Router(config)# interface gigabitEthernet 0/0.10
Router(config-subif)# ip helper-address 192.168.100.10
```

---

## 4. Outils de Diagnostic et Commandes Pratiques

### Diagnostic DNS :

```bash
# Résolution directe détaillée avec dig (sous Linux)
dig @192.168.1.10 srv-web.opensio.lan A

# Résolution inverse d'une adresse IP
dig -x 192.168.1.50 +short

# Interrogation interactive sous Windows et Linux avec nslookup
nslookup
> set type=MX
> opensio.lan
> exit
```

### Diagnostic DHCP :

```bash
# Sous Linux : forcer la libération et le renouvellement du bail
dhclient -r eth0 && dhclient -v eth0

# Sous Windows :
ipconfig /release
ipconfig /renew
ipconfig /all

# Capturer les échanges DORA sur l'interface réseau avec tcpdump
tcpdump -i eth0 -n "port 67 or port 68"
```
