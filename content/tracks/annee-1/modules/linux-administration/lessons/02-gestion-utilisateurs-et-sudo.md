---
slug: gestion-utilisateurs-et-sudo
title: "Gestion des utilisateurs, des groupes et délégation des privilèges sudo"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 45
objectives:
  - "Comprendre la structure des fichiers d'identités /etc/passwd, /etc/shadow et /etc/group"
  - "Créer et administrer des comptes utilisateurs et des groupes système"
  - "Appliquer la politique d'expiration de mot de passe et de verrouillage de compte (chage)"
  - "Configurer finement la délégation d'administration sudo via le fichier /etc/sudoers"
prerequisites:
  - "arborescence-fhs-et-permissions"
competency_refs:
  - "B1.1"
  - "B1.2"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Gestion des Utilisateurs et Sudo' avec au moins 80 %"
labs: []
references:
  - label: "Documentation Debian — Gestion des utilisateurs et de sudo"
    url: "https://wiki.debian.org/fr/Sudo"
  - label: "Man-page sudoers(5)"
    url: "https://manpages.debian.org/bookworm/sudo/sudoers.5.fr.html"
---

# Gestion des Utilisateurs, des Groupes et Délégation des Privilèges Sudo

Dans un environnement Linux multi-utilisateurs, la gestion rigoureuse des identités et l'attribution du moindre privilège d'administration sont indispensables pour préserver la sécurité du système.

---

## 1. Les Fichiers d'Identité Système

Trois fichiers plats sous `/etc` centralisent les comptes et les groupes locaux :

### 1.1. `/etc/passwd` (Informations publiques des comptes)
Lisible par tous les utilisateurs (`644`). Chaque ligne comporte 7 champs séparés par des deux-points `:` :

```text
lucas:x:1001:1001:Lucas Dubois,Bureau 204:/home/lucas:/bin/bash
  1   2  3    4             5                 6          7
```
1. **Nom d'utilisateur** (`login`)
2. **Mot de passe** (`x` indique que le hash réside dans `/etc/shadow`)
3. **UID** (User ID : 0 pour root, 1-999 pour les services système, >= 1000 pour les utilisateurs normaux)
4. **GID** (Group ID principal)
5. **GECOS** (Nom complet, coordonnées)
6. **Répertoire personnel** (`Home directory`)
7. **Shell de connexion** (`/bin/bash`, ou `/usr/sbin/nologin` pour bloquer les connexions interactives)

### 1.2. `/etc/shadow` (Hashs et politique de mots de passe)
Accessible uniquement par `root` (`640`). Contient le hash cryptographique (ex: SHA-512 ou Yescrypt) ainsi que la date de modification, la durée de validité minimale/maximale et l'avertissement d'expiration.

### 1.3. `/etc/group` (Définition des groupes)
Associe les GID aux noms de groupes et liste leurs membres secondaires :
```text
technique:x:1005:lucas,sophie,thomas
```

---

## 2. Administration des Utilisateurs et Groupes en Ligne de Commande

```bash
# 1. Créer un groupe
groupadd -g 1050 direction

# 2. Créer un utilisateur avec répertoire personnel, shell bash et groupe secondaire
useradd -m -s /bin/bash -u 1051 -g direction -G sudo,technique -c "Directeur Technique" jdupont

# 3. Définir le mot de passe initial
passwd jdupont

# 4. Forcer le changement de mot de passe à la première connexion
chage -d 0 jdupont

# 5. Définir une expiration maximale de mot de passe (90 jours)
chage -M 90 jdupont

# 6. Verrouiller ou déverrouiller un compte temporairement
usermod -L jdupont   # Lock
usermod -U jdupont   # Unlock
```

---

## 3. Délégation d'Administration avec Sudo

L'utilitaire `sudo` (_Superuser Do_) permet à un utilisateur autorisé d'exécuter des commandes avec les privilèges d'un autre utilisateur (généralement `root`), tout en consignant chaque action dans les journaux d'audit (`/var/log/auth.log`).

### 3.1. Règle d'or : Utiliser `visudo`
Ne modifiez jamais `/etc/sudoers` directement avec un éditeur standard. Utilisez toujours la commande `visudo` qui verrouille le fichier et vérifie la syntaxe avant d'enregistrer.

### 3.2. Syntaxe des règles sudoers
La syntaxe générale est :
```text
utilisateur_ou_groupe   machine=(cible)   [NOPASSWD:] commandes
```

Exemples types :

```text
# Autoriser le groupe 'sudo' à tout exécuter avec mot de passe
%sudo   ALL=(ALL:ALL) ALL

# Autoriser l'administrateur de sauvegarde à lancer rsync sans mot de passe
backup-adm  ALL=(root) NOPASSWD: /usr/bin/rsync, /usr/bin/tar

# Autoriser les techniciens réseau à redémarrer les services réseau uniquement
%technique  ALL=(root) /usr/bin/systemctl restart networking, /usr/bin/systemctl restart bind9
```

### 3.3. Découpage modulaire dans `/etc/sudoers.d/`
Il est recommandé d'ajouter des fichiers spécifiques dans `/etc/sudoers.d/` (ex: `/etc/sudoers.d/10-technique`) avec des permissions strictes (`0440`).

---

## 4. Bonnes Pratiques de Sécurité

- Désactivez la connexion directe en SSH du compte `root` (`PermitRootLogin no` dans `sshd_config`).
- Attribuez à chaque administrateur un compte personnel membre du groupe `sudo`.
- Affectez un shell `/usr/sbin/nologin` à tous les comptes de services applicatifs.
