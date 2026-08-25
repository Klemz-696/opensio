---
slug: modeles-osi-tcpip
title: "Modèles OSI et TCP/IP : architectures, couches et protocoles"
version: 1.0.0
last_reviewed: "2026-08-25"
difficulty: 2
estimated_minutes: 50
objectives:
  - "Identifier les 7 couches du modèle OSI et les 4 couches du modèle TCP/IP"
  - "Comprendre le mécanisme d'encapsulation, de décapsulation et les unités PDU"
  - "Distinguer les caractéristiques et cas d'usage des protocoles TCP et UDP"
  - "Associer les protocoles applicatifs courants à leurs numéros de port standard"
  - "Utiliser les commandes de diagnostic réseau de base (ping, traceroute, ss, netstat)"
prerequisites:
  - "adressage-ipv4"
competency_refs:
  - "B2.1"
  - "B2.2"
success_criteria:
  - "Réussir le quiz 'Modèles OSI et TCP/IP' avec au moins 80 %"
labs: []
references:
  - label: "RFC 1122 — Requirements for Internet Hosts (Communication Layers)"
    url: "https://www.rfc-editor.org/rfc/rfc1122"
  - label: "RFC 793 — Transmission Control Protocol (TCP)"
    url: "https://www.rfc-editor.org/rfc/rfc793"
  - label: "RFC 768 — User Datagram Protocol (UDP)"
    url: "https://www.rfc-editor.org/rfc/rfc768"
---

# Modèles OSI et TCP/IP : Architectures Réseau et Protocoles

La compréhension des architectures en couches constitue la base absolue de l'administration réseau et du diagnostic de pannes. Deux modèles de référence coexistent : le modèle théorique **OSI** (7 couches) et le modèle pratique **TCP/IP** (4 couches), sur lequel repose l'ensemble d'Internet et des réseaux locaux modernes.

---

## 1. Le Modèle OSI (Open Systems Interconnection)

Normalisé par l'ISO en 1984, le modèle OSI découpe la communication réseau en sept couches fonctionnelles distinctes, du support physique jusqu'à l'application utilisateur.

| N° | Couche | Rôle principal | PDU (Unité de données) | Équipement / Protocole type |
|---|---|---|---|---|
| 7 | **Application** | Interface avec les applications utilisateur | Données (Data) | HTTP, HTTPS, SSH, DNS, DHCP, SMTP |
| 6 | **Présentation** | Formatage, chiffrement, compression des données | Données | TLS/SSL, ASCII, JPEG, JSON |
| 5 | **Session** | Établissement, gestion et fermeture des sessions | Données | RPC, NetBIOS, Sockets |
| 4 | **Transport** | Communication de bout en bout, fiabilité, contrôle de flux | Segment (TCP) / Datagramme (UDP) | TCP, UDP |
| 3 | **Réseau** | Adressage logique et routage entre réseaux distincts | Paquet (Packet) | IPv4, IPv6, ICMP, IPsec, Routeur |
| 2 | **Liaison de données** | Adressage physique (MAC), détection d'erreurs, trames | Trame (Frame) | Ethernet (802.3), Wi-Fi (802.11), Commutateur (Switch) |
| 1 | **Physique** | Transmission brute des signaux (électriques, optiques, radio) | Bit | Câble RJ45 (cuivre), Fibre optique, Hub |

---

## 2. Le Modèle TCP/IP et Correspondance avec l'OSI

Le modèle TCP/IP, conçu pour le réseau ARPANET, est un modèle pragmatique organisé en 4 couches.

```text
+-----------------------+-----------------------+
|      Modèle OSI       |     Modèle TCP/IP     |
+-----------------------+-----------------------+
| 7. Application        |                       |
| 6. Présentation       | 4. Application        |
| 5. Session            |                       |
+-----------------------+-----------------------+
| 4. Transport          | 3. Transport          |
+-----------------------+-----------------------+
| 3. Réseau             | 2. Internet           |
+-----------------------+-----------------------+
| 2. Liaison de données | 1. Accès réseau       |
| 1. Physique           |    (Network Access)   |
+-----------------------+-----------------------+
```

---

## 3. Le Processus d'Encapsulation et Décapsulation

Lorsqu'une application transmet une information à travers le réseau :
1. **Encapsulation (émission)** : Chaque couche ajoute un en-tête (_header_) contenant les métadonnées de contrôle nécessaires à son homologue récepteur.
   - Couche Application : produit les **Données**.
   - Couche Transport : ajoute l'en-tête TCP/UDP (ports source/destination) $\rightarrow$ produit un **Segment**.
   - Couche Réseau/Internet : ajoute l'en-tête IP (adresses IP source/destination) $\rightarrow$ produit un **Paquet**.
   - Couche Liaison : ajoute l'en-tête Ethernet (adresses MAC source/destination) et la queue de contrôle FCS/CRC $\rightarrow$ produit une **Trame**.
   - Couche Physique : convertit la trame en **Bits** transmis sur le médium.
2. **Décapsulation (réception)** : L'équipement récepteur lit, valide et retire successivement chaque en-tête en remontant les couches de 1 à 7.

---

## 4. Couche Transport : TCP vs UDP

| Caractéristique | TCP (Transmission Control Protocol) | UDP (User Datagram Protocol) |
|---|---|---|
| **Mode de connexion** | Orienté connexion (Three-Way Handshake) | Sans connexion (Connectionless) |
| **Fiabilité** | Garantie : acquittements (ACK) et retransmissions | Aucune garantie de livraison |
| **Ordre des données** | Respecté via numéros de séquence | Non garanti |
| **Contrôle de flux** | Fenêtrage glissant (_Window Size_) | Aucun |
| **Surcharge (Overhead)** | En-tête de 20 octets (minimum) | En-tête léger de 8 octets |
| **Usages typiques** | Web (HTTP/HTTPS), Transfert (SSH, SFTP), Messagerie (SMTP) | Streaming audio/vidéo, VoIP, Jeux en ligne, DNS (requêtes), DHCP |

### Le Three-Way Handshake (Poignée de main TCP)
L'établissement d'une session TCP s'effectue en 3 étapes :
1. Le client envoie un paquet avec le drapeau `SYN` (Synchronize) et un numéro de séquence initial $X$.
2. Le serveur répond avec les drapeaux `SYN-ACK` (numéro de séquence $Y$ et acquittement $X+1$).
3. Le client confirme avec un drapeau `ACK` (acquittement $Y+1$). La connexion est alors établie (`ESTABLISHED`).

---

## 5. Ports et Protocoles Applicatifs Majeurs

Les numéros de port (sur 16 bits, de 0 à 65535) permettent d'aiguiller le trafic vers l'application réceptrice appropriée.

- **Ports bien connus (_Well-known ports_) : 0 à 1023** (réservés aux services système fondamentaux).
- **Ports enregistrés : 1024 à 49151**.
- **Ports dynamiques / privés : 49152 à 65535** (utilisés comme ports source clients éphémères).

| Port standard | Protocole de transport | Service / Rôle |
|---|---|---|
| **20 / 21** | TCP | FTP (File Transfer Protocol — données / contrôle) |
| **22** | TCP | SSH (Secure Shell) / SFTP |
| **23** | TCP | Telnet (non chiffré, obsolète) |
| **25** | TCP | SMTP (Simple Mail Transfer Protocol — envoi de courriels) |
| **53** | UDP / TCP | DNS (Domain Name System — UDP requêtes standard, TCP transferts de zone) |
| **67 / 68** | UDP | DHCP (Serveur : port 67, Client : port 68) |
| **80** | TCP | HTTP (HyperText Transfer Protocol) |
| **110** | TCP | POP3 (Post Office Protocol v3 — relève de boîte aux lettres) |
| **143** | TCP | IMAP (Internet Message Access Protocol — synchronisation de boîte) |
| **443** | TCP | HTTPS (HTTP over TLS/SSL) |
| **3389** | TCP / UDP | RDP (Remote Desktop Protocol — Bureau à distance Windows) |

---

## 6. Commandes Essentielles de Diagnostic Réseau

### Sous Linux (Debian) :

```bash
# Vérifier la connectivité de niveau 3 (ICMP Echo Request / Reply)
ping -c 4 192.168.1.1

# Tracer la route IP et repérer les routeurs intermédiaires
traceroute -n 8.8.8.8

# Afficher tous les sockets TCP et UDP en écoute avec processus associés
ss -tulnp

# Analyser les statistiques des interfaces réseau
ip -s link show
```

### Sous Windows :

```powershell
# Tester la connectivité de niveau 3
Test-Connection -TargetName 1.1.1.1 -Count 4

# Tracer la route vers une destination
tracert 1.1.1.1

# Lister les ports en écoute et connexions actives avec PID
netstat -ano | findstr LISTENING

# Tester l'ouverture d'un port TCP spécifique (niveau 4)
Test-NetConnection -ComputerName srv-app.lan -Port 443
```
