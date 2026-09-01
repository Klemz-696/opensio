---
slug: relais-dhcp-et-multi-sous-reseaux
title: "Relais DHCP (DHCP Relay / IP Helper), multi-sous-réseaux et routage des requêtes"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 3
estimated_minutes: 45
objectives:
  - "Comprendre pourquoi les broadcasts DHCP (255.255.255.255) ne traversent pas les routeurs par défaut"
  - "Maîtriser le fonctionnement de l'agent de relais DHCP (Option 82, champ giaddr)"
  - "Déployer et configurer isc-dhcp-relay / dhcp-helper sous Linux"
  - "Structurer un serveur DHCP centralisé gérant plusieurs sous-réseaux et VLANs"
  - "Configurer la directive ip helper-address sur un équipement réseau / routeur"
prerequisites:
  - "serveur-dhcp-linux"
  - "modeles-osi-tcpip"
competency_refs:
  - "B2.1"
  - "B2.2"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Relais DHCP et Multi-Sous-Réseaux' avec au moins 80 %"
labs: []
references:
  - label: "RFC 3046 — DHCP Relay Agent Information Option"
    url: "https://datatracker.ietf.org/doc/html/rfc3046"
  - label: "Documentation ISC — DHCP Relay Configuration"
    url: "https://kb.isc.org/docs/isc-dhcp-relay"
---

# Relais DHCP, Multi-Sous-Réseaux et Routage des Requêtes

Dans une architecture d'entreprise segmentée en plusieurs **VLANs** ou sous-réseaux routés, il est impensable de déployer un serveur DHCP physique dans chaque sous-réseau. L'**agent de relais DHCP** (_DHCP Relay Agent_) permet de centraliser la distribution d'adresses sur un unique serveur DHCP.

---

## 1. La Problématique des Broadcasts Réseau

Les requêtes `DHCPDISCOVER` sont émises à l'adresse de diffusion `255.255.255.255` (Couche 3) et `FF:FF:FF:FF:FF:FF` (Couche 2).
Par conception fondamentale du modèle OSI, **un routeur ne transmet jamais les trames de diffusion générale** d'un sous-réseau vers un autre.

```text
[Client VLAN 20] ──(Broadcast)──> [Routeur / Relais DHCP] ──(Unicast IP)──> [Serveur DHCP Central (VLAN 10)]
192.168.20.50                      Passerelle: 192.168.20.254                 192.168.10.10
```

---

## 2. Le Rôle du Relais DHCP et le Champ `giaddr`

Lorsqu'un agent de relais reçoit une requête broadcast sur son interface locale :
1. Il intercepte le paquet `DHCPDISCOVER`.
2. Il injecte dans l'en-tête DHCP l'adresse IP de son interface locale dans le champ **`giaddr`** (_Gateway IP Address_), par exemple `192.168.20.254`.
3. Il encapsule la requête dans un paquet **Unicast routable** à destination de l'adresse du serveur DHCP central (`192.168.10.10`).
4. Le serveur DHCP reçoit l'Unicast, lit le champ `giaddr` (`192.168.20.254`), en déduit que le client appartient au sous-réseau `192.168.20.0/24`, et pioche une adresse disponible dans la plage correspondante.

---

## 3. Configuration du Serveur DHCP Central pour Plusieurs Sous-Réseaux

Dans `/etc/dhcp/dhcpd.conf` du serveur central :

```text
# --- Sous-réseau local du serveur (VLAN 10 Serveurs) ---
subnet 192.168.10.0 netmask 255.255.255.0 {
    # Pas de range si les serveurs ont des IPs fixes, ou range limitée
    option routers 192.168.10.254;
    option domain-name-servers 192.168.10.10;
}

# --- Sous-réseau distant desservi via Relais (VLAN 20 Utilisateurs) ---
subnet 192.168.20.0 netmask 255.255.255.0 {
    range 192.168.20.50 192.168.20.200;
    option routers 192.168.20.254;
    option domain-name-servers 192.168.10.10;
    option domain-name "utilisateurs.entreprise.lan";
}

# --- Sous-réseau distant desservi via Relais (VLAN 30 Wi-Fi Invités) ---
subnet 192.168.30.0 netmask 255.255.255.0 {
    range 192.168.30.10 192.168.30.250;
    default-lease-time 7200;  # Bail court de 2h pour les invités
    option routers 192.168.30.254;
    option domain-name-servers 1.1.1.1, 9.9.9.9;
}
```

---

## 4. Déploiement de l'Agent de Relais

### 4.1. Sous Linux avec `isc-dhcp-relay`
```bash
apt install -y isc-dhcp-relay
```
Dans `/etc/default/isc-dhcp-relay` :
```text
# Adresse IP du serveur DHCP distant
SERVERS="192.168.10.10"

# Interfaces d'écoute côté clients (interfaces vers VLANs 20 et 30) et côté serveur (interface vers VLAN 10)
INTERFACES="eth1 eth2 eth0"

OPTIONS=""
```

### 4.2. Sur un équipement réseau (Cisco / Routeur L3)
```text
interface Vlan20
 description VLAN-Utilisateurs
 ip address 192.168.20.254 255.255.255.0
 ip helper-address 192.168.10.10
!
```

---

## 5. Diagnostic et Surveillance

```bash
# Surveiller les paquets DHCP relayés en temps réel avec tcpdump
tcpdump -i any -n "port 67 or port 68" -v

# Vérifier le journal du relais
journalctl -u isc-dhcp-relay -f
```
