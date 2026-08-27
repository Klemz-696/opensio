---
slug: vpn-site-a-site-et-acces-distants
title: "VPN Site-à-Site, Accès Distants et Chiffrement (IPsec & WireGuard)"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 3
estimated_minutes: 55
objectives:
  - "Comprendre les principes fondamentaux des VPNs (Encapsulation, Chiffrement, Intégrité HMAC, Authentification)"
  - "Distinguer les topologies de VPN Site-à-Site (LAN-to-LAN) et Nomade (Remote Access)"
  - "Analyser l'architecture IPsec (IKEv2, ESP, AH, Phase 1 et Phase 2)"
  - "Déployer un tunnel VPN moderne et performant avec WireGuard"
  - "Appliquer les recommandations cryptographiques de l'ANSSI (PFS, AES-GCM, ChaCha20-Poly1305)"
prerequisites:
  - "reseaux-fondamentaux"
  - "routage-interconnexion"
  - "principes-securite-perimetrique-zones"
competency_refs:
  - "B2.1"
  - "B3.1"
success_criteria:
  - "Réussir le quiz 'VPN Site-à-Site et Accès Distants' avec au moins 80 %"
labs:
  - slug: configuration-tunnel-vpn-wireguard
    required: true
references:
  - label: "WireGuard Official Technical Whitepaper"
    url: "https://www.wireguard.com/papers/wireguard.pdf"
  - label: "IETF RFC 7296 - Internet Key Exchange Protocol Version 2 (IKEv2)"
    url: "https://datatracker.ietf.org/doc/html/rfc7296"
---

# VPN Site-à-Site, Accès Distants et Chiffrement (IPsec & WireGuard)

Un **VPN** (_Virtual Private Network_) établit un tunnel chiffré et authentifié à travers un réseau non sécurisé (Internet), garantissant la confidentialité et l'intégrité des communications inter-sites et des accès télétravail.

---

## 1. Propriétés Fondamentales de Sécurité d'un VPN

```text
[ Trame IP Interne ] ──► [ Chiffrement (AES-256 / ChaCha20) + Signature HMAC ]
                                          │
                                          ▼ (Encapsulation dans en-tête public)
                          [ Paquet Chiffré sur Internet ]
                                          │
                                          ▼ (Décapsulation & Vérification Intégrité)
                              [ Trame IP Originale Restaurée ]
```

1. **Confidentialité** : Les données sont chiffrées (AES-256-GCM, ChaCha20-Poly1305) ; un espion sur Internet ne voit que du bruit cryptographique.
2. **Intégrité des données** : Garantit qu'aucun octet n'a été altéré ou injecté en transit (HMAC-SHA256, Poly1305).
3. **Authentification des pairs** : Validation réciproque de l'identité des passerelles (certificats X.509 ou paires de clés asymétriques).
4. **Anti-rejeu (_Anti-Replay_)** : Les paquets sont numérotés pour empêcher un attaquant de réémettre des trames interceptées.

---

## 2. Topologies VPN : Site-à-Site vs Nomade

- **VPN Site-à-Site (LAN-to-LAN)** : Interconnecte de manière permanente deux réseaux locaux (ex: Siège et Agence) via leurs routeurs/passerelles. Le chiffrement et le déchiffrement sont totalement transparents pour les utilisateurs.
- **VPN Nomade (_Remote Access / Road Warrior_)** : Un collaborateur en déplacement ou télétravail utilise un client logiciel (WireGuard, OpenVPN, Cisco AnyConnect) pour se connecter au réseau interne de l'entreprise avec authentification multifacteur (MFA).

---

## 3. Comparatif Technique des Protocoles VPN

| Critère | IPsec (IKEv2) | WireGuard | OpenVPN |
|---|---|---|---|
| **Couche réseau** | Couche 3 (Noyau OS) | Couche 3 (Module Noyau Linux) | Couche 4/7 (Espace utilisateur / TUN) |
| **Algorithmes cryptographiques** | Modulaires (AES-CBC/GCM, SHA-2, DH Groups) | Fixes et modernes (Curve25519, ChaCha20-Poly1305) | Dépend d'OpenSSL (TLS 1.2 / 1.3) |
| **Complexité de configuration** | Élevée (IKE Phase 1 / Phase 2, Proposal) | Très faible (fichier déclaratif `.conf` minimaliste) | Moyenne (fichiers de certificats `.crt/.key`) |
| **Performance & Débit** | Très élevé (accélération matérielle AES-NI) | Exceptionnel (faible latence, consommation CPU minime)| Moyen (surcoût des bascules noyau/user-space) |
| **Usage privilégié** | Interconnexion de routeurs d'entreprise multi-marques | Tunnels inter-serveurs Linux, VPN agile, Cloud | Télétravail nomade avec portail d'authentification |

---

## 4. Configuration d'un Tunnel Site-à-Site avec WireGuard

WireGuard fonctionne sur le principe de **Cryptokey Routing** : chaque clé publique est associée à une liste d'adresses IP autorisées (`AllowedIPs`).

### Passerelle Site A (Siège — 192.168.10.0/24) :
```ini
# /etc/wireguard/wg0.conf (Site A)
[Interface]
Address = 10.100.0.1/30
ListenPort = 51820
PrivateKey = aaaaaa_SITE_A_PRIVATE_KEY_aaaaaa=

[Peer]
# Clé publique du routeur de l'Agence B
PublicKey = bbbbbb_SITE_B_PUBLIC_KEY_bbbbbb=
Endpoint = 198.51.100.20:51820
# Sous-réseaux routés à travers le tunnel
AllowedIPs = 10.100.0.2/32, 192.168.20.0/24
PersistentKeepalive = 25
```

### Passerelle Site B (Agence — 192.168.20.0/24) :
```ini
# /etc/wireguard/wg0.conf (Site B)
[Interface]
Address = 10.100.0.2/30
ListenPort = 51820
PrivateKey = cccccc_SITE_B_PRIVATE_KEY_cccccc=

[Peer]
# Clé publique du Siège A
PublicKey = dddddd_SITE_A_PUBLIC_KEY_dddddd=
Endpoint = 203.0.113.10:51820
# Sous-réseaux routés à travers le tunnel
AllowedIPs = 10.100.0.1/32, 192.168.10.0/24
PersistentKeepalive = 25
```

> [!TIP]
> La directive `PersistentKeepalive = 25` envoie un paquet de liveness toutes les 25 secondes, maintenant les tables d'état des routeurs NAT intermédiaires ouvertes même en l'absence de trafic applicatif.
