---
slug: resolution-dns-recursive-cache
title: "Résolution DNS récursive, serveurs de cache, redirection (Forwarders) et sécurisation"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 3
estimated_minutes: 45
objectives:
  - "Comprendre le mécanisme de résolution itérative et récursive depuis les serveurs racines (Root Hints)"
  - "Configurer un résolveur DNS cache d'entreprise pour accélérer la navigation"
  - "Mettre en place des redirecteurs (Forwarders) et des redirecteurs conditionnels"
  - "Sécuriser le résolveur contre les attaques d'empoisonnement de cache (DNS Cache Poisoning) et d'amplification"
  - "Restreindre la récursion aux sous-réseaux internes avec les listes de contrôle d'accès (ACL)"
prerequisites:
  - "serveur-dns-bind9-autorite"
competency_refs:
  - "B2.1"
  - "B2.2"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Résolution DNS Récursive et Cache' avec au moins 80 %"
labs: []
references:
  - label: "ANSSI — Recommandations de sécurité pour la mise en œuvre d'un serveur DNS"
    url: "https://cyber.gouv.fr/publications/recommandations-de-securite-pour-la-mise-en-oeuvre-dun-serveur-dns"
  - label: "ISC BIND 9 — Forwarding and Recursion Configuration"
    url: "https://bind9.readthedocs.io/en/latest/reference.html#options-statement-grammar"
---

# Résolution DNS Récursive, Serveurs de Cache et Sécurisation

Un résolveur DNS a pour mission de trouver l'adresse IP associée à un nom de domaine Internet pour le compte d'un client. Il interroge la hiérarchie DNS mondiale (serveurs racines, serveurs TLD, serveurs faisant autorité), conserve les réponses en mémoire cache et relaie le résultat.

---

## 1. Résolution Récursive vs Itérative

```text
Poste Client                    Résolveur Local (Bind9)                 Serveurs Mondiaux
     │                                     │                                    │
     │── 1. Requête Récursive ────────────>│                                    │
     │   (« Trouve-moi www.wikipedia.org »)│                                    │
     │                                     │── 2. Requête Itérative ───────────>│ Serveur Racine (.)
     │                                     │<── 3. Réponse : Va voir le .org ───│
     │                                     │── 4. Requête Itérative ───────────>│ Serveur TLD (.org)
     │                                     │<── 5. Réponse : Va voir wikipedia ─│
     │                                     │── 6. Requête Itérative ───────────>│ Serveur Autorité (wikipedia.org)
     │                                     │<── 7. Réponse : IP = 185.15.59.224 │
     │                                     │                                    │
     │<── 8. Réponse finale au client ─────│ (IP mise en cache locale TTL)      │
     │                                     │                                    │
```

---

## 2. Configuration des Options Globales (`named.conf.options`)

Pour transformer un serveur Bind9 en résolveur d'entreprise sécurisé, on configure `/etc/bind/named.conf.options` :

```text
// 1. Définition des listes de contrôle d'accès (ACL)
acl "reseaux_internes" {
    127.0.0.0/8;
    192.168.10.0/24;
    192.168.20.0/24;
};

options {
    directory "/var/cache/bind";

    // Écoute sur l'interface LAN et Loopback uniquement
    listen-on port 53 { 127.0.0.1; 192.168.10.10; };
    listen-on-v6 { none; };

    // --- Sécurité de la Récursion (CRITIQUE) ---
    // Activer la récursion UNIQUEMENT pour les postes de l'entreprise
    recursion yes;
    allow-recursion { "reseaux_internes"; };
    allow-query { "reseaux_internes"; };

    // --- Redirection vers des Forwarders externes (DNS FAI ou sécurisés) ---
    forwarders {
        1.1.1.1;        // Cloudflare DNS
        9.9.9.9;        // Quad9 (bloque les domaines malveillants)
    };
    forward only;       // Interroger uniquement les forwarders (ou 'first' pour tenter les racines en cas d'échec)

    // --- Validation Cryptographique DNSSEC ---
    dnssec-validation auto;

    // --- Masquage de la Version du Logiciel ---
    version "Non communique";
};
```

---

## 3. Redirection Conditionnelle (_Conditional Forwarding_)

Dans le cadre d'un réseau hybride ou d'une fusion d'entreprises, on souhaite souvent rediriger les requêtes vers le domaine d'un partenaire sans passer par Internet.

Dans `named.conf.local` :

```text
// Rediriger toutes les requêtes pour *.filiale.lan vers son contrôleur de domaine
zone "filiale.lan" {
    type forward;
    forwarders { 10.50.0.10; 10.50.0.11; };
};
```

---

## 4. Vulnérabilités & Bonnes Pratiques ANSSI

### 4.1. Interdire formellement le résolveur ouvert (_Open Resolver_)
Si la récursion est ouverte à `any` sur une adresse IP publique, des attaquants détourneront votre serveur pour lancer des **attaques par amplification DNS DDoS** (requêtes forgées envoyant de lourdes réponses à une victime).

### 4.2. Empoisonnement de Cache (_DNS Cache Poisoning / Kaminsky Attack_)
Pour contrer l'injection de faux enregistrements dans le cache :
- Bind9 applique la randomisation des ports source UDP (`port-randomization`).
- L'activation de **DNSSEC** (`dnssec-validation auto;`) garantit la signature cryptographique des réponses DNS.

### 4.3. Commandes d'administration du cache (`rndc`)
```bash
# Vider l'intégralité du cache DNS en mémoire
rndc flush

# Vider le cache pour un domaine particulier
rndc flushname exemple.com

# Afficher l'état du serveur Bind9
rndc status
```
