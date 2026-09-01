---
slug: serveur-dns-bind9-autorite
title: "Serveur DNS faisant autorité avec Bind9 : zones directes, inverses et enregistrements"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 3
estimated_minutes: 55
objectives:
  - "Comprendre le rôle d'un serveur DNS faisant autorité (Authoritative Name Server)"
  - "Structurer l'architecture de configuration de Bind9 sous Debian (/etc/bind/)"
  - "Créer et configurer une zone directe d'entreprise (db.domaine) et sa zone inverse (db.ip)"
  - "Maîtriser la syntaxe exacte des enregistrements DNS fondamentaux (SOA, NS, A, AAAA, PTR, CNAME, MX, TXT)"
  - "Valider les fichiers de zones avec named-checkconf et named-checkzone"
prerequisites:
  - "dns-et-dhcp"
  - "gestion-services-systemd"
competency_refs:
  - "B2.1"
  - "B2.2"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Serveur DNS Bind9 Faisant Autorité' avec au moins 80 %"
  - "Valider l'atelier 'Configuration d'un Serveur DNS Bind9'"
labs:
  - slug: configuration-dns-bind9
    required: true
references:
  - label: "ISC BIND 9 Administrator Reference Manual (ARM)"
    url: "https://bind9.readthedocs.io/en/latest/"
  - label: "Documentation Debian — Configuration de Bind9"
    url: "https://wiki.debian.org/fr/Bind9"
---

# Serveur DNS Faisant Autorité avec Bind9

**BIND 9** (_Berkeley Internet Name Domain_) est le serveur DNS de référence sur l'Internet et les réseaux d'entreprise. Un serveur **faisant autorité** détient la copie originale officielle d'une zone DNS et répond de manière définitive pour les noms de ce domaine.

---

## 1. Organisation des Fichiers sous Debian

Sous `/etc/bind/`, la configuration est découpée par responsabilité :

| Fichier | Rôle |
|---|---|
| `named.conf` | Point d'entrée principal incluant les autres fichiers |
| `named.conf.options` | Directives globales (écoute, forwarders, restrictions d'accès, DNSSEC) |
| `named.conf.local` | Déclaration des zones locales gérées par le serveur |
| `named.conf.default-zones` | Déclarations des zones par défaut (localhost, 127.in-addr.arpa, broadcast) |

---

## 2. Déclaration des Zones dans `named.conf.local`

```text
// Zone directe
zone "entreprise.lan" {
    type master;                          // Serveur maître (faisant autorité)
    file "/etc/bind/db.entreprise.lan";   // Chemin du fichier de zone
    allow-transfer { 192.168.10.11; };    // Autoriser le transfert de zone vers le serveur esclave uniquement
};

// Zone inverse pour le sous-réseau 192.168.10.0/24
zone "10.168.192.in-addr.arpa" {
    type master;
    file "/etc/bind/db.192.168.10";
    allow-transfer { 192.168.10.11; };
};
```

---

## 3. Fichier de Zone Directe (`/etc/bind/db.entreprise.lan`)

Le fichier de zone contient l'enregistrement **SOA** (_Start of Authority_) et l'ensemble des enregistrements de ressources :

```text
$TTL    86400           ; Durée de vie par défaut des enregistrements (1 jour)
@       IN      SOA     ns1.entreprise.lan. admin.entreprise.lan. (
                        2026082701      ; Numéro de série (YYYYMMDDNN - à incrémenter à chaque modif)
                        28800           ; Refresh (8 heures) : intervalle de synchro de l'esclave
                        7200            ; Retry (2 heures) : délai en cas d'échec de contact
                        2419200         ; Expire (4 semaines) : durée de validité max pour l'esclave
                        3600 )          ; Negative Cache TTL (1 heure)

; --- Serveurs de Noms (NS) ---
@       IN      NS      ns1.entreprise.lan.
@       IN      NS      ns2.entreprise.lan.

; --- Serveur de Messagerie (MX) ---
@       IN      MX  10  mail.entreprise.lan.

; --- Enregistrements d'Hôtes IPv4 (A) et IPv6 (AAAA) ---
ns1             IN      A       192.168.10.10
ns2             IN      A       192.168.10.11
mail            IN      A       192.168.10.15
srv-web         IN      A       192.168.10.20
srv-web         IN      AAAA    2001:db8:acad:10::20

; --- Alias Canoniques (CNAME) ---
www             IN      CNAME   srv-web.entreprise.lan.
intranet        IN      CNAME   srv-web.entreprise.lan.

; --- Enregistrements Texte (SPF / DKIM) ---
@               IN      TXT     "v=spf1 mx ip4:192.168.10.15 ~all"
```

> ⚠️ **Le point terminal (`.`)** : Si un FQDN ne se termine pas par un point, Bind9 lui concatène automatiquement le nom de la zone courante. Par exemple `ns1.entreprise.lan` (sans point) deviendrait `ns1.entreprise.lan.entreprise.lan.` !

---

## 4. Fichier de Zone Inverse (`/etc/bind/db.192.168.10`)

La zone inverse résout les adresses IP en noms d'hôtes (enregistrements **PTR**) :

```text
$TTL    86400
@       IN      SOA     ns1.entreprise.lan. admin.entreprise.lan. (
                        2026082701 28800 7200 2419200 3600 )

@       IN      NS      ns1.entreprise.lan.

; Enregistrements PTR (Dernier octet de l'IP dans 192.168.10.0/24)
10      IN      PTR     ns1.entreprise.lan.
11      IN      PTR     ns2.entreprise.lan.
15      IN      PTR     mail.entreprise.lan.
20      IN      PTR     srv-web.entreprise.lan.
```

---

## 5. Contrôle Syntaxique et Test avec `dig`

```bash
# 1. Vérifier la syntaxe globale des fichiers de configuration
named-checkconf

# 2. Vérifier l'intégrité de la zone directe
named-checkzone entreprise.lan /etc/bind/db.entreprise.lan

# 3. Vérifier l'intégrité de la zone inverse
named-checkzone 10.168.192.in-addr.arpa /etc/bind/db.192.168.10

# 4. Recharger la configuration Bind9 sans coupure
rndc reload

# 5. Tester la résolution avec dig (interrogation ciblée sur 127.0.0.1)
dig @127.0.0.1 www.entreprise.lan +short
dig @127.0.0.1 -x 192.168.10.20 +short
```
