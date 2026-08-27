---
slug: serveur-dhcp-linux
title: "Déploiement et configuration d'un serveur DHCP sous Linux (ISC-DHCP & Kea)"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 50
objectives:
  - "Comprendre le cycle de distribution d'adresses DORA (Discover, Offer, Request, Acknowledge)"
  - "Configurer le serveur DHCP ISC (/etc/dhcp/dhcpd.conf) avec étendues, options réseau et baux statiques"
  - "Découvrir l'architecture moderne du serveur ISC Kea (JSON / REST API)"
  - "Analyser le fichier des baux actifs (/var/lib/dhcp/dhcpd.leases) et diagnostiquer les pannes de distribution"
prerequisites:
  - "dns-et-dhcp"
  - "gestion-services-systemd"
competency_refs:
  - "B2.1"
  - "B2.2"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Serveur DHCP Linux' avec au moins 80 %"
  - "Valider l'atelier 'Configuration d'un Serveur DHCP Kea'"
labs:
  - slug: configuration-dhcp-kea
    required: true
references:
  - label: "ISC DHCP Server Documentation"
    url: "https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf"
  - label: "ISC Kea Administrator Reference Manual"
    url: "https://kea.readthedocs.io/en/latest/"
---

# Déploiement et Configuration d'un Serveur DHCP sous Linux

Le protocole **DHCP** (_Dynamic Host Configuration Protocol_, RFC 2131) permet d'automatiser l'attribution des paramètres réseau IP (adresse IPv4, masque, passerelle par défaut, serveurs DNS, domaine de recherche) aux clients du réseau local.

---

## 1. Rappel du Processus DORA

La négociation entre le client et le serveur s'effectue en 4 étapes UDP (ports 67 serveur et 68 client) :

```text
Client                                             Serveur DHCP
  │                                                      │
  │─── 1. DHCPDISCOVER (Broadcast 255.255.255.255) ─────>│ (Recherche d'un serveur)
  │<── 2. DHCPOFFER    (Unicast / Broadcast) ────────────│ (Proposition d'une IP + options)
  │─── 3. DHCPREQUEST  (Broadcast d'acceptation) ───────>│ (Confirmation du client)
  │<── 4. DHCPACK      (Accusé de réception) ────────────│ (Bail accordé)
  │                                                      │
```

---

## 2. Configuration du Serveur `isc-dhcp-server`

Le fichier principal de configuration est `/etc/dhcp/dhcpd.conf` :

```text
# --- Paramètres Globaux par Défaut ---
default-lease-time 86400;      # 24 heures (en secondes)
max-lease-time 172800;          # 48 heures maximum
authoritative;                 # Le serveur fait autorité sur le sous-réseau

# Options distribuées à l'ensemble des clients
option domain-name "entreprise.lan";
option domain-name-servers 192.168.10.10, 192.168.10.11;
option ntp-servers 192.168.10.1;

# --- Déclaration d'un Sous-Réseau (Subnet) ---
subnet 192.168.10.0 netmask 255.255.255.0 {
    # Plage d'adresses dynamiques distribuées aux clients
    range 192.168.10.50 192.168.10.200;

    # Option 3 : Passerelle par défaut (Default Gateway)
    option routers 192.168.10.254;

    # Option 1 : Masque de sous-réseau
    option subnet-mask 255.255.255.0;

    # Option 28 : Adresse de broadcast
    option broadcast-address 192.168.10.255;
}

# --- Réservation d'Adresse IP Statique (Bail Permanent) ---
host srv-imprimante-prod {
    hardware ethernet 00:11:22:33:44:55;
    fixed-address 192.168.10.20;
    option host-name "imp-prod-01";
}
```

### Interfaces d'écoute :
Sous Debian, configurez l'interface d'écoute dans `/etc/default/isc-dhcp-server` :
```text
INTERFACESv4="eth0"
```

---

## 3. Le Serveur Moderne de Nouvelle Génération : ISC Kea

ISC Kea remplace progressivement ISC-DHCP. Il est modulaire, rapide et se configure en **JSON** (`/etc/kea/kea-dhcp4.conf`) :

```json
{
  "Dhcp4": {
    "interfaces-config": {
      "interfaces": ["eth0"]
    },
    "lease-database": {
      "type": "memfile",
      "persist": true,
      "name": "/var/lib/kea/kea-leases4.csv"
    },
    "valid-lifetime": 86400,
    "renew-timer": 43200,
    "subnet4": [
      {
        "id": 1,
        "subnet": "192.168.20.0/24",
        "pools": [
          { "pool": "192.168.20.50 - 192.168.20.200" }
        ],
        "option-data": [
          { "name": "routers", "data": "192.168.20.254" },
          { "name": "domain-name-servers", "data": "192.168.20.10, 1.1.1.1" },
          { "name": "domain-name", "data": "prod.entreprise.lan" }
        ],
        "reservations": [
          {
            "hw-address": "aa:bb:cc:dd:ee:ff",
            "ip-address": "192.168.20.15",
            "hostname": "serveur-nas"
          }
        ]
      }
    ]
  }
}
```

---

## 4. Exploitation et Dépannage

```bash
# 1. Vérifier la syntaxe du fichier dhcpd.conf avant redémarrage
dhcpd -t -cf /etc/dhcp/dhcpd.conf

# 2. Démarrer et surveiller le service
systemctl restart isc-dhcp-server
systemctl status isc-dhcp-server

# 3. Consulter les baux dynamiques actuellement accordés
cat /var/lib/dhcp/dhcpd.leases

# 4. Surveiller en direct les échanges DHCP DORA
journalctl -u isc-dhcp-server -f
```

### Symptôme d'adresse 169.254.x.x (APIPA) :
Si un poste client reçoit une adresse APIPA, cela signifie que ses requêtes `DHCPDISCOVER` n'ont reçu aucun `DHCPOFFER`. Causes courantes :
1. Le serveur DHCP est arrêté ou en échec (`systemctl status`).
2. Le service écoute sur la mauvaise interface réseau.
3. Le commutateur réseau isole le client dans un VLAN différent sans relais DHCP (`IP Helper`).
