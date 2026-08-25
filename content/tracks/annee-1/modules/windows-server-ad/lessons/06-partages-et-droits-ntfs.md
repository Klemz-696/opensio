---
slug: partages-et-droits-ntfs
title: "Partages de fichiers et droits NTFS : autorisations, héritage et méthode AGDLP"
version: 1.0.0
last_reviewed: "2026-08-25"
difficulty: 3
estimated_minutes: 55
objectives:
  - "Distinguer les autorisations de Partage réseau (SMB) et les autorisations NTFS du système de fichiers"
  - "Calculer les droits effectifs résultant du cumul entre Partage et NTFS (règle du plus restrictif)"
  - "Maîtriser les mécanismes d'héritage NTFS, de désactivation de l'héritage et de droits explicites"
  - "Concevoir une arborescence de dossiers partagés sécurisée selon la méthode AGDLP"
  - "Automatiser la création de partages SMB et la gestion des ACLs NTFS avec PowerShell et icacls"
  - "Diagnostiquer les blocages d'accès et les problèmes de droits effectifs"
prerequisites:
  - "utilisateurs-groupes-uo"
competency_refs:
  - "B1.1"
  - "B1.2"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Partages et Droits NTFS' avec au moins 80 %"
  - "Compléter l'atelier pratique 'Partage et droits NTFS'"
labs:
  - slug: partage-et-droits-ntfs
    required: true
references:
  - label: "Documentation Microsoft — Vue d'ensemble du partage de fichiers SMB"
    url: "https://learn.microsoft.com/fr-fr/windows-server/storage/file-server/file-server-smb-overview"
  - label: "Documentation Microsoft — Contrôle d'accès et autorisations NTFS"
    url: "https://learn.microsoft.com/fr-fr/windows-server/identity/ad-ds/manage/how-security-principals-work"
---

# Partages de Fichiers et Droits NTFS : Autorisations, Héritage et Stratégie AGDLP

Dans un système d'information Windows Server, la sécurisation des données partagées repose sur une double barrière de contrôle d'accès : les **autorisations de Partage réseau (SMB)** et les **autorisations de sécurité du système de fichiers (NTFS)**. L'administration professionnelle impose une maîtrise parfaite du cumul des permissions, de la gestion de l'héritage et de la méthodologie **AGDLP**.

---

## 1. La Double Barrière : Partage SMB vs NTFS

Lorsqu'un utilisateur accède à un dossier partagé à travers le réseau (ex : `\\SRV-FILE01\Donnees`), le système Windows évalue successivement deux couches de sécurité indépendantes :

```text
[ Client Réseau ]
        |
        v
+---------------------------------------------------------+
|   BARRIÈRE 1 : AUTORISATIONS DE PARTAGE (SMB)           |
|   (Lecture, Modifier, Contrôle total)                   |
+---------------------------------------------------------+
        |
        v  (Si autorisé)
+---------------------------------------------------------+
|   BARRIÈRE 2 : AUTORISATIONS DU SYSTÈME DE FICHIERS NTFS|
|   (Lecture, Lecture & Exécution, Écriture, Modifier...) |
+---------------------------------------------------------+
        |
        v
[ ACCÈS FINAL : DROIT EFFECTIF = LE PLUS RESTRICTIF DES DEUX ]
```

### 1.1. Les Autorisations de Partage (SMB)
- S'appliquent **uniquement** lors d'un accès à travers le réseau (via chemin UNC `\\serveur\partage`).
- S'appliquent de manière uniforme à l'ensemble du dossier partagé et de ses sous-dossiers.
- Niveaux possibles : **Lecture**, **Modifier** (_Change_), **Contrôle total** (_Full Control_).

### 1.2. Les Autorisations NTFS
- S'appliquent **en permanence**, que l'accès soit réseau (SMB) ou local (session interactive sur le serveur).
- Permettent une granularité très fine au niveau de chaque sous-dossier et de chaque fichier individuel.
- Niveaux standards majeurs :
  - **Lecture** : Consulter les fichiers et lister les dossiers.
  - **Écriture** : Créer de nouveaux fichiers et dossiers.
  - **Lecture et exécution** : Consulter et exécuter des programmes/scripts.
  - **Modification** : Lire, créer, modifier le contenu ET supprimer des fichiers/dossiers.
  - **Contrôle total** : Modification + modification des autorisations de sécurité (ACL) + appropriation du fichier.

---

## 2. La Règle d'Or du Calcul des Droits Effectifs

> ⚠️ **Principe du Plus Restrictif** :
> Lors d'un accès par le réseau, l'autorisation finale accordée à l'utilisateur est **l'intersection la plus restrictive entre les droits de Partage et les droits NTFS**.

### Exemples d'évaluation :

| Autorisation Partage SMB | Autorisation NTFS | Droit Effectif Réseau Final | Explication |
|---|---|---|---|
| Lecture | Contrôle total | **Lecture** | Le Partage limite l'accès à la seule lecture. |
| Contrôle total | Lecture | **Lecture** | NTFS bloque les modifications et suppressions. |
| Modifier | Modifier | **Modifier** | Les deux couches autorisent la lecture/écriture/suppression. |
| Contrôle total | Refus explicite (_Deny_) | **Accès refusé** | Un refus explicite l'emporte TOUJOURS sur toute autorisation. |

### 💡 Bonne Pratique d'Architecture Microsoft :
Afin de ne pas gérer deux matrices complexes de permissions en parallèle, la recommandation officielle consiste à :
1. Positionner les **autorisations de Partage SMB au niveau maximal** : `Tout le monde` (_Everyone_) ou `Utilisateurs du domaine` en **Modifier** (ou Contrôle total).
2. Verrouiller et piloter l'intégralité de la sécurité fine **exclusivement via les autorisations NTFS**.

---

## 3. Mécanismes d'Héritage NTFS

Par défaut, tout nouveau sous-dossier ou fichier créé hérite automatiquement des autorisations NTFS définies sur son dossier parent :
- **Autorisations héritées** : Transmises automatiquement par le dossier parent (visibles en gris dans les propriétés de sécurité).
- **Autorisations explicites** : Ajoutées manuellement et directement sur l'objet cible.
- **Désactiver l'héritage** : Obligatoire pour isoler un sous-dossier confidentiel (ex : `D:\Partages\Direction`). L'administrateur peut alors :
  - _Convertir_ les autorisations héritées en autorisations explicites (recommandé pour conserver les accès administrateurs).
  - _Supprimer_ toutes les autorisations héritées.

---

## 4. Implémentation de la Méthode AGDLP sur les Dossiers Partagés

Pour structurer les accès à un dossier `D:\Partages\Comptabilite` :

$$\mathbf{A} \text{ (Comptables)} \longrightarrow \mathbf{G} \text{ (GG\_Comptabilite)} \longrightarrow \mathbf{DL} \text{ (GDL\_PartageCompta\_M)} \longrightarrow \mathbf{P} \text{ (NTFS Modifier)}$$

```text
1. Comptes utilisateurs : jdupont, mmartin
2. Groupe Global : GG_Comptabilite (contient jdupont, mmartin)
3. Groupes de Domaine Local créés :
   - GDL_PartageCompta_L  (Permissions NTFS : Lecture)
   - GDL_PartageCompta_M  (Permissions NTFS : Modification)
4. Imbrication : GG_Comptabilite est membre de GDL_PartageCompta_M
5. ACL NTFS sur le dossier :
   - SYSTEM                     : Contrôle total
   - Administrateurs            : Contrôle total
   - GDL_PartageCompta_M        : Modification
   - GDL_PartageCompta_L        : Lecture & Exécution
```

---

## 5. Automatisation avec PowerShell et `icacls`

### 5.1. Création du Partage SMB via PowerShell
```powershell
# Créer le dossier physique
New-Item -ItemType Directory -Path "D:\Partages\Comptabilite" -Force

# Créer le partage SMB avec autorisations de partage larges
New-SmbShare `
  -Name "Comptabilite" `
  -Path "D:\Partages\Comptabilite" `
  -FullAccess "Administrateurs" `
  -ChangeAccess "Utilisateurs du domaine" `
  -Description "Partage du service Comptabilité"
```

### 5.2. Gestion des ACLs NTFS avec l'utilitaire `icacls`
```powershell
# 1. Désactiver l'héritage et copier les droits existants en explicites
icacls "D:\Partages\Comptabilite" /inheritance:d

# 2. Supprimer les droits du groupe générique 'Utilisateurs'
icacls "D:\Partages\Comptabilite" /remove "Utilisateurs"

# 3. Accorder le droit de Modification au groupe GDL_PartageCompta_M
icacls "D:\Partages\Comptabilite" /grant "OPENSIO\GDL_PartageCompta_M":(OI)(CI)(M)

# 4. Accorder le droit de Lecture au groupe GDL_PartageCompta_L
icacls "D:\Partages\Comptabilite" /grant "OPENSIO\GDL_PartageCompta_L":(OI)(CI)(RX)
```

> **Signification des drapeaux d'héritage `icacls`** :
> - `(OI)` — _Object Inherit_ : Les fichiers enfants héritent de la règle.
> - `(CI)` — _Container Inherit_ : Les sous-dossiers enfants héritent de la règle.
> - `(M)` — _Modify_ : Droit de modification (Lecture, écriture, suppression).
> - `(RX)` — _Read and Execute_ : Droit de lecture et d'exécution.
> - `(F)` — _Full Control_ : Contrôle total.
