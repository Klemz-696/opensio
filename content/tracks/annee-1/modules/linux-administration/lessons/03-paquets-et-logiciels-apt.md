---
slug: paquets-et-logiciels-apt
title: "Gestion des paquets, dépôts logiciels APT et maintenance du système"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 40
objectives:
  - "Comprendre le fonctionnement du gestionnaire de paquets APT et de l'outil de bas niveau dpkg"
  - "Configurer et sécuriser les dépôts de paquets (/etc/apt/sources.list et sources.list.d/)"
  - "Rechercher, installer, mettre à jour et purger des paquets logiciels"
  - "Automatiser les correctifs de sécurité critiques avec unattended-upgrades"
prerequisites:
  - "gestion-utilisateurs-et-sudo"
competency_refs:
  - "B1.1"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Paquets et Logiciels APT' avec au moins 80 %"
labs: []
references:
  - label: "Manuel Debian — Gestion des paquets avec APT"
    url: "https://www.debian.org/doc/manuals/debian-handbook/apt.fr.html"
  - label: "Documentation Debian — Mises à jour de sécurité automatiques"
    url: "https://wiki.debian.org/UnattendedUpgrades"
---

# Gestion des Paquets, Dépôts Logiciels APT et Maintenance du Système

Sur les distributions dérivées de Debian (Debian, Ubuntu), la gestion logicielle s'appuie sur le format de paquet `.deb` et sur la suite d'outils **APT** (_Advanced Package Tool_), garantissant la résolution automatique des dépendances et l'intégrité cryptographique des binaires.

---

## 1. Architecture des Dépôts Logiciels

APT télécharge les paquets depuis des serveurs miroirs officiels définis dans `/etc/apt/sources.list` ou dans des fichiers séparés sous `/etc/apt/sources.list.d/*.sources`.

### 1.1. Structure d'une ligne de dépôt standard
```text
deb http://deb.debian.org/debian bookworm main contrib non-free-firmware
 1                    2            3                    4
```
1. **Type d'archive** : `deb` pour les binaires précompilés, `deb-src` pour le code source.
2. **URL du miroir** : Serveur HTTP/HTTPS distribuant les paquets.
3. **Branche de distribution** : Version (ex: `bookworm`, `trixie`, `bookworm-security`).
4. **Sections de composants** :
   - `main` : Logiciels 100 % libres conformes aux DFSG (_Debian Free Software Guidelines_).
   - `contrib` : Logiciels libres dépendant de composants non libres.
   - `non-free-firmware` & `non-free` : Pilotes matériels et logiciels propriétaires.

### 1.2. Sécurité & Signatures GPG
Chaque dépôt fournit un fichier d'index signé par une clé cryptographique GPG. Depuis Debian 12, les clés des dépôts tiers sont placées au format binaire dans `/etc/apt/keyrings/`.

---

## 2. Commandes d'Exploitation APT Courantes

```bash
# 1. Mettre à jour l'index local des paquets disponibles
apt update

# 2. Appliquer les mises à jour logicielles de sécurité et de version mineure
apt upgrade -y

# 3. Mettre à niveau le système complet (gestion des nouvelles dépendances/suppressions)
apt full-upgrade -y

# 4. Rechercher un paquet par mot-clé
apt search nginx

# 5. Consulter les détails, la version et les dépendances d'un paquet
apt show isc-dhcp-server

# 6. Installer un paquet
apt install -y bind9 bind9utils

# 7. Supprimer un paquet en conservant sa configuration
apt remove bind9

# 8. Supprimer un paquet ET purger tous ses fichiers de configuration
apt purge bind9

# 9. Supprimer les dépendances orphelines devenues inutiles
apt autoremove --purge -y

# 10. Nettoyer le cache local des archives .deb téléchargées
apt clean
```

---

## 3. L'Outil de Bas Niveau : `dpkg`

`dpkg` manipule directement les fichiers `.deb` locaux sans interroger les dépôts distants et **sans résoudre automatiquement les dépendances**.

```bash
# Installer un paquet .deb téléchargé localement
dpkg -i paquet-local.deb

# Si des dépendances manquent, forcer leur téléchargement via APT
apt install -f

# Lister tous les paquets installés sur le système
dpkg -l

# Vérifier à quel paquet appartient un fichier système donné
dpkg -S /etc/nginx/nginx.conf

# Lister tous les fichiers installés par un paquet
dpkg -L ufw
```

---

## 4. Automatisation des Correctifs de Sécurité (`unattended-upgrades`)

Pour assurer le maintien en conditions de sécurité (MCS) d'un parc de serveurs, Debian intègre le paquet `unattended-upgrades` qui télécharge et applique automatiquement les correctifs de sécurité critiques dès leur publication.

```bash
# Installation et activation du service
apt install -y unattended-upgrades apt-listchanges
dpkg-reconfigure -plow unattended-upgrades
```

La configuration dans `/etc/apt/apt.conf.d/50unattended-upgrades` permet de définir :
- Les dépôts cibles autorisés (sécurité uniquement).
- Le redémarrage automatique en cas de mise à jour du noyau (`Unattended-Upgrade::Automatic-Reboot "true";`).
- L'heure planifiée du redémarrage nocturne (`Unattended-Upgrade::Automatic-Reboot-Time "03:30";`).
