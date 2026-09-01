---
slug: arborescence-fhs-et-permissions
title: "Arborescence FHS, permissions UNIX et listes de contrôle d'accès (ACL)"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 50
objectives:
  - "Comprendre la structure de l'arborescence standardisée Filesystem Hierarchy Standard (FHS)"
  - "Maîtriser les permissions standard UNIX (lecture, écriture, exécution) en notation symbolique et octale"
  - "Exploiter les droits spéciaux SUID, SGID et Sticky Bit sur les fichiers et dossiers"
  - "Configurer des droits étendus avancés avec les ACLs POSIX (getfacl, setfacl)"
prerequisites:
  - "modeles-osi-tcpip"
competency_refs:
  - "B1.1"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Arborescence FHS et Permissions' avec au moins 80 %"
  - "Valider l'atelier 'Droits FHS et Permissions'"
labs:
  - slug: droits-fhs-et-permissions
    required: true
references:
  - label: "Linux Foundation — Filesystem Hierarchy Standard (FHS 3.0)"
    url: "https://refspecs.linuxfoundation.org/FHS_3.0/fhs/index.html"
  - label: "Documentation Debian — Gestion des permissions et ACLs"
    url: "https://wiki.debian.org/fr/Permissions"
---

# Arborescence FHS, Permissions UNIX et Listes de Contrôle d'Accès (ACL)

Sous GNU/Linux, **tout est fichier** (y compris les périphériques physiques, les répertoires et les flux d'interprocessus). La rigueur de l'arborescence et le modèle de sécurité des permissions constituent le fondement de l'administration système.

---

## 1. La Norme FHS (Filesystem Hierarchy Standard)

L'arborescence Linux commence à la racine unique `/`. Les principaux répertoires normalisés sont :

| Répertoire | Rôle & Contenu |
|---|---|
| `/bin` & `/sbin` | Binaires essentiels pour tous les utilisateurs (`/bin`) et pour l'administrateur (`/sbin`) |
| `/etc` | Fichiers de configuration statiques de l'ensemble des services et du système |
| `/home` | Répertoires personnels des utilisateurs standards (ex: `/home/eleve`) |
| `/root` | Répertoire personnel du superutilisateur `root` |
| `/var` | Données variables (journaux `/var/log`, files d'attente `/var/spool`, sites `/var/www`) |
| `/tmp` | Fichiers temporaires nettoyés au redémarrage ou par script périodique |
| `/usr` | Logiciels installés, documentations (`/usr/share`) et bibliothèques (`/usr/lib`) |
| `/opt` | Logiciels tiers autonomes ou propriétaires (ex: agents de supervision) |
| `/dev` | Nœuds de périphériques matériels et virtuels (disques `/dev/sda`, null, urandom) |
| `/proc` & `/sys` | Systèmes de fichiers virtuels fournissant l'état du noyau et des processus en mémoire |

---

## 2. Le Modèle de Permissions Standard UNIX

Chaque fichier ou répertoire possède un **propriétaire (u - user)**, un **groupe propriétaire (g - group)** et s'applique aux **autres (o - others)**.

### 2.1. Les trois droits élémentaires

```text
r (Read)    : Lecture du fichier / Liste du contenu du répertoire  (Valeur octale = 4)
w (Write)   : Écriture/Modification du fichier / Ajout ou suppression dans le répertoire (Valeur octale = 2)
x (Execute) : Exécution du script ou binaire / Traversée du répertoire (Valeur octale = 1)
```

```text
- r w x r - x r - -   (Notation symbolique)
  └──┬──┘ └──┬──┘ └──┬──┘
     │      │      └── Others (Lecture seule = 4)
     │      └──────── Group  (Lecture + Exécution = 5)
     └─────────────── User   (Lecture + Écriture + Exécution = 7)
→ Valeur octale : 754
```

### 2.2. Commandes de modification

```bash
# Modifier les permissions en notation octale
chmod 750 /var/www/site-interne

# Modifier les permissions en notation symbolique
chmod u=rwx,g=rx,o= /var/www/site-interne
chmod g+w /var/www/site-interne

# Modifier le propriétaire et le groupe
chown www-data:www-data /var/www/site-interne -R
```

---

## 3. Les Droits Spéciaux (SUID, SGID, Sticky Bit)

Pour répondre aux besoins d'élévation et de partage collaboratif, trois bits spéciaux complètent le modèle standard :

### 3.1. SUID (Set User ID — Valeur octale 4000)
- **Application** : Fichiers exécutables uniquement.
- **Effet** : Le programme s'exécute avec les privilèges de son **propriétaire**, quel que soit l'utilisateur qui le lance (ex: `/usr/bin/passwd` appartenant à `root` avec droit `-rwsr-xr-x`).
- **Commande** : `chmod u+s /usr/local/bin/monscript` ou `chmod 4755 ...`.

### 3.2. SGID (Set Group ID — Valeur octale 2000)
- **Sur fichier** : Le programme s'exécute avec les privilèges du groupe propriétaire.
- **Sur répertoire (indispensable en entreprise)** : Tout nouveau fichier ou dossier créé dans ce répertoire **hérite automatiquement du groupe propriétaire du dossier parent**.
- **Commande** : `chmod g+s /partages/comptabilite` ou `chmod 2770 ...`.

### 3.3. Sticky Bit (Valeur octale 1000)
- **Application** : Répertoires partagés en écriture (ex: `/tmp`, `/partages/commun`).
- **Effet** : Seul le propriétaire d'un fichier ou `root` peut le **renommer ou le supprimer**, même si le répertoire est accessible en écriture par tous (`rwxrwxrwt`).
- **Commande** : `chmod +t /partages/commun` ou `chmod 1777 ...`.

---

## 4. Les Listes de Contrôle d'Accès (ACL POSIX)

Lorsque la structure tripartite standard (Propriétaire / Groupe / Autres) ne suffit pas (par exemple : accorder des droits en lecture à un second groupe sans ouvrir aux autres), on utilise les **ACLs**.

```bash
# Afficher les ACLs d'un dossier
getfacl /data/projets

# Accorder des droits de lecture/écriture au groupe 'comptables'
setfacl -m g:comptables:rwx /data/projets

# Définir une ACL par défaut (héritage sur les futurs sous-éléments)
setfacl -d -m g:comptables:rwx /data/projets

# Supprimer une ACL spécifique
setfacl -x g:comptables /data/projets
```

---

## 5. Synthèse & Bonnes Pratiques

- N'accordez jamais de droit `777` en production.
- Utilisez le `SGID` combiné à un groupe de domaine/service pour les répertoires de travail partagés.
- Protégez les espaces temporaires partagés avec le `Sticky Bit`.
- Documentez les ACLs mises en place car elles ne sont pas immédiatement visibles avec un simple `ls -l` (marquées par un signe `+` en fin de permissions, ex: `drwxrwx---+`).
