---
slug: pare-feu-stateful-et-filtrage
title: "Pare-feu Stateful, Suivi des Connexions (Conntrack) et Règles nftables"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 3
estimated_minutes: 55
objectives:
  - "Comprendre la différence fondamentale entre filtrage sans état (Stateless) et avec état (Stateful Inspection)"
  - "Maîtriser les 4 états du module de suivi des connexions conntrack (NEW, ESTABLISHED, RELATED, INVALID)"
  - "Concevoir une politique de sécurité 'Default-Deny' étanche"
  - "Écrire des règles de pare-feu modernes avec nftables (tables inet, chaînes et hooks)"
  - "Mettre en place la journalisation des flux suspects et l'audit des règles"
prerequisites:
  - "reseaux-fondamentaux"
  - "principes-securite-perimetrique-zones"
competency_refs:
  - "B2.2"
  - "B3.1"
success_criteria:
  - "Réussir le quiz 'Pare-feu Stateful et Filtrage' avec au moins 80 %"
labs:
  - slug: configuration-pare-feu-stateful-nftables
    required: true
references:
  - label: "Netfilter / nftables Official Documentation"
    url: "https://wiki.nftables.org/"
  - label: "ANSSI — Recommandations de configuration d'un pare-feu sous Linux"
    url: "https://www.ssi.gouv.fr/"
---

# Pare-feu Stateful, Suivi des Connexions (Conntrack) et Règles nftables

Le pare-feu avec état (**Stateful Firewall**) inspecte le contexte bidirectionnel des échanges pour n'autoriser les paquets de retour que s'ils correspondent à une session légitimement initiée.

---

## 1. Filtrage Sans État (Stateless) vs Avec État (Stateful)

```text
[ Client LAN ] ────────────────► [ Pare-feu ] ────────────────► [ Serveur Web ]
  192.168.1.10:54321               │                               93.184.216.34:443
                                   │
                                   ▼
          ┌───────────────────────────────────────────────────┐
          │ Table Conntrack (State Table) :                   │
          │ TCP: 192.168.1.10:54321 <-> 93.184.216.34:443    │
          │ State: ESTABLISHED, Timeout: 300s                 │
          └───────────────────────────────────────────────────┘
```

- **Stateless (sans état)** : Filtre chaque paquet individuellement selon ses en-têtes (IP source/dest, port source/dest). Pour permettre la réponse d'un serveur Web, l'administrateur doit ouvrir aveuglément tous les ports éphémères entrants ($>1024$), ce qui crée une brèche de sécurité majeure.
- **Stateful (avec état)** : Dès qu'une connexion sortante est acceptée en état `NEW`, le pare-feu enregistre la session dans sa table d'état. Les réponses correspondantes passent automatiquement en état `ESTABLISHED` sans nécessiter d'ouverture de port statique en entrée.

### Les 4 états du moteur Conntrack :
1. **`NEW`** : Premier paquet d'initiation d'une nouvelle session valide (ex: paquet TCP avec flag SYN seul).
2. **`ESTABLISHED`** : Paquets appartenant à une connexion déjà établie et validée dans les deux sens.
3. **`RELATED`** : Paquet ouvrant un flux secondaire lié à une session existante (ex: canal de données FTP passif, ou messages d'erreur ICMP _Destination Unreachable_).
4. **`INVALID`** : Paquet corrompu, hors séquence, avec combinaison de flags anormale (ex: scans TCP Null/Xmas). **Doit être immédiatement jeté (DROP)**.

---

## 2. Architecture et Syntaxe du Moteur `nftables`

`nftables` est l'infrastructure moderne de filtrage du noyau Linux (remplaçant `iptables`). Sa famille de tables `inet` permet de traiter l'IPv4 et l'IPv6 au sein des mêmes règles.

### Structure d'un fichier de règles `/etc/nftables.conf` :
```text
#!/usr/sbin/nft -f

# 1. Vidage des règles précédentes pour garantir l'idempotence
flush ruleset

# 2. Définition de la table unifiée IPv4/IPv6
table inet filter {
    
    # Chaîne INPUT : trafic destiné directement au routeur/pare-feu lui-même
    chain input {
        type filter hook input priority filter; policy drop;

        # Accepter le trafic de boucle locale (loopback)
        iif "lo" accept

        # Suivi d'état : autoriser les sessions établies et jeter les paquets invalides
        ct state invalid drop
        ct state { established, related } accept

        # Autoriser SSH d'administration depuis le LAN uniquement
        iif "eth0" tcp dport 22 ct state new accept

        # Journaliser et rejeter tout le reste (Default-Deny)
        log prefix "NFT-INPUT-DROP: " flags all counter drop
    }

    # Chaîne FORWARD : trafic transitant d'une zone à une autre (routé)
    chain forward {
        type filter hook forward priority filter; policy drop;

        # Suivi d'état global
        ct state invalid drop
        ct state { established, related } accept

        # 1. Flux LAN vers WAN (Navigation Internet autorisée)
        iif "eth0" oif "eth1" ct state new accept

        # 2. Flux WAN vers DMZ (Accès Web public vers Reverse Proxy)
        iif "eth1" oif "eth2" ip daddr 192.168.50.10 tcp dport { 80, 443 } ct state new accept

        # 3. Flux DMZ vers LAN : strictement interdit par défaut (policy drop)

        # Journalisation des rejets de transit
        log prefix "NFT-FWD-DROP: " flags all counter drop
    }

    # Chaîne OUTPUT : trafic émis par le pare-feu lui-même
    chain output {
        type filter hook output priority filter; policy accept;
    }
}
```

---

## 3. Commandes d'Exploitation et d'Audit `nftables`

- **Vérifier la syntaxe d'un fichier sans l'appliquer** :
  ```bash
  sudo nft -c -f /etc/nftables.conf
  ```
- **Appliquer la configuration de manière atomique** :
  ```bash
  sudo nft -f /etc/nftables.conf
  ```
- **Afficher les règles actives et les compteurs de paquets** :
  ```bash
  sudo nft list ruleset
  ```
- **Surveiller les journaux de rejets en direct** :
  ```bash
  sudo journalctl -k -f | grep "NFT-"
  ```
