---
slug: synchronisation-horaire-ntp
title: "Synchronisation horaire et serveurs de temps NTP sous Linux (Chrony, NTPsec, systemd-timesyncd)"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 40
objectives:
  - "Comprendre l'importance critique de la synchronisation temporelle (Kerberos, TLS, corrélation de journaux)"
  - "Maîtriser la hiérarchie des strates NTP (Stratum 0 à 15)"
  - "Déployer et configurer Chrony comme serveur de temps local d'entreprise (/etc/chrony/chrony.conf)"
  - "Vérifier la dérive d'horloge, le décalage (offset) et les sources avec chronyc"
  - "Sécuriser les flux NTP et limiter les requêtes aux sous-réseaux autorisés"
prerequisites:
  - "gestion-services-systemd"
competency_refs:
  - "B2.1"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Synchronisation Horaire NTP' avec au moins 80 %"
labs: []
references:
  - label: "Chrony Documentation & Administrator Guide"
    url: "https://chrony-project.org/doc/4.3/chrony.conf.html"
  - label: "ANSSI — Recommandations relatives à la synchronisation temporelle"
    url: "https://cyber.gouv.fr/publications/recommandations-relatives-la-synchronisation-temporelle"
---

# Synchronisation Horaire et Serveurs de Temps NTP sous Linux

La synchronisation précise de l'heure sur l'ensemble d'un système d'information n'est pas un simple confort : c'est un **prérequis strict de sécurité et de fonctionnement** indispensable à l'authentification Kerberos (tolérance maximale de 5 minutes), à la validité des certificats TLS et à la corrélation chronologique des journaux d'audit lors d'un incident de sécurité.

---

## 1. La Hiérarchie des Strates NTP

Le protocole **NTP** (_Network Time Protocol_, port UDP 123) s'organise en strates hiérarchiques :

```text
[Stratum 0] : Horloges atomiques de référence, récepteurs GPS / Galileo
      │
      ▼
[Stratum 1] : Serveurs NTP maîtres directement connectés aux horloges Stratum 0
      │
      ▼
[Stratum 2] : Serveurs NTP publics (ex: pool.ntp.org) synchronisés sur les Stratum 1
      │
      ▼
[Stratum 3] : Serveurs NTP d'entreprise (Chrony) synchronisés sur les Stratum 2
      │
      ▼
[Stratum 4] : Postes de travail clients et serveurs applicatifs internes
```

---

## 2. Le Serveur de Référence Moderne : `Chrony`

**Chrony** est le démon NTP moderne recommandé par Debian, Red Hat et l'ANSSI pour sa rapidité de convergence, sa faible consommation de ressources et sa gestion des déconnexions réseau.

### 2.1. Fichier de configuration `/etc/chrony/chrony.conf`
```text
# --- Sources de temps distantes fiables (Pool officiel français) ---
server 0.fr.pool.ntp.org iburst
server 1.fr.pool.ntp.org iburst
server 2.fr.pool.ntp.org iburst
server 3.fr.pool.ntp.org iburst

# Fichier d'enregistrement de la dérive de l'horloge matérielle
driftfile /var/lib/chrony/chrony.drift

# Tolérer un saut brutal d'horloge au premier démarrage si le décalage dépasse 1s
makestep 1.0 3

# Enregistrer l'horloge temps réel matérielle (RTC)
rtcsync

# --- Configuration en mode Serveur NTP pour le LAN ---
# Autoriser uniquement les réseaux internes de l'entreprise
allow 192.168.10.0/24
allow 192.168.20.0/24

# En cas de perte de connectivité Internet, continuer à servir l'heure locale (Stratum 10)
local stratum 10

# Journalisation des statistiques
logdir /var/log/chrony
log measurements statistics tracking
```

---

## 3. Commandes d'Exploitation avec `chronyc`

L'utilitaire `chronyc` permet d'interroger et de contrôler le démon `chronyd` en temps réel :

```bash
# 1. Lister les sources NTP synchronisées et leur état
chronyc sources -v

# 2. Afficher les statistiques de suivi temporel et le décalage (offset / jitter)
chronyc tracking

# 3. Afficher les statistiques de connectivité vers chaque serveur de temps
chronyc sourcestats -v

# 4. Forcer un alignement immédiat de l'heure
chronyc makestep
```

### Comprendre la sortie de `chronyc sources` :
- `*` : Source actuellement sélectionnée comme référence primaire.
- `+` : Sources candidates acceptables prêtes pour le basculement.
- `^` : Serveur distant standard.
- `iburst` : Envoie 8 paquets rapprochés au démarrage pour une synchronisation quasi instantanée.

---

## 4. Client Léger : `systemd-timesyncd`

Sur les postes clients ou conteneurs légers ne nécessitant pas de jouer le rôle de serveur de temps, Debian intègre le client simplifié `systemd-timesyncd` configuré dans `/etc/systemd/timesyncd.conf` :

```ini
[Time]
NTP=192.168.10.1
FallbackNTP=0.debian.pool.ntp.org 1.debian.pool.ntp.org
```

Pour consulter l'état de l'horloge système et du fuseau horaire :
```bash
timedatectl status
timedatectl set-timezone Europe/Paris
timedatectl set-ntp true
```
