---
slug: utilisateurs-groupes-uo
title: "Utilisateurs, groupes et unités d'organisation : gestion des identités et stratégie AGDLP"
version: 1.0.0
last_reviewed: "2026-08-25"
difficulty: 3
estimated_minutes: 55
objectives:
  - "Concevoir une arborescence d'Unités d'Organisation (UO) structurée et maintenable"
  - "Gérer le cycle de vie des comptes utilisateurs et ordinateurs dans Active Directory"
  - "Distinguer les types de groupes (Sécurité vs Distribution) et leurs étendues (Domaine Local, Global, Universel)"
  - "Appliquer rigoureusement la stratégie d'imbrication AGDLP / AGUDLP pour la gestion des droits"
  - "Automatiser la gestion des comptes et des groupes avec le module PowerShell ActiveDirectory"
  - "Mettre en place la délégation d'administration sur des UO spécifiques"
prerequisites:
  - "ad-ds-et-domaine"
competency_refs:
  - "B1.1"
  - "B1.2"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Utilisateurs, Groupes et UO' avec au moins 80 %"
  - "Compléter l'atelier pratique 'Organisation UO et GPO'"
labs:
  - slug: organisation-uo-et-gpo
    required: true
references:
  - label: "Documentation Microsoft — Bonnes pratiques pour la conception d'unités d'organisation"
    url: "https://learn.microsoft.com/fr-fr/windows-server/identity/ad-ds/plan/designing-an-ou-structure-hierarchy"
  - label: "Documentation Microsoft — Gestion des groupes Active Directory"
    url: "https://learn.microsoft.com/fr-fr/windows-server/identity/ad-ds/manage/understand-security-groups"
---

# Utilisateurs, Groupes et Unités d'Organisation : Gestion des Identités et Stratégie AGDLP

La gestion des identités et des accès (IAM) au sein d'Active Directory repose sur une organisation rigoureuse des **Unités d'Organisation (UO)**, des **comptes utilisateurs et machines**, et des **groupes de sécurité**. L'adoption de la méthode de référence **AGDLP** garantit une traçabilité exemplaire et une administration pérenne des autorisations d'accès aux ressources.

---

## 1. Conception d'une Arborescence d'Unités d'Organisation (UO)

Une **Unité d'Organisation (UO / _OU_)** est un conteneur administratif permettant de regrouper logiquement des objets au sein d'un domaine.

### 1.1. Rôles clés d'une UO :
1. **Lier des Stratégies de Groupe (GPO)** : Une GPO ne peut être liée qu'au niveau du Domaine, d'un Site ou d'une UO (jamais sur des conteneurs par défaut comme `CN=Users` ou `CN=Computers`).
2. **Déléguer l'administration** : Accorder des droits restreints à une équipe technique (ex : autoriser le support N1 à réinitialiser les mots de passe de l'UO `Utilisateurs`).

### 1.2. Modèle d'arborescence recommandé en entreprise :

```text
DC=opensio,DC=lan
├── OU=Entreprise
│   ├── OU=Utilisateurs
│   │   ├── OU=Direction
│   │   ├── OU=Comptabilite
│   │   └── OU=Technique
│   ├── OU=Ordinateurs
│   │   ├── OU=Portables
│   │   └── OU=Fixes
│   ├── OU=Serveurs
│   └── OU=Groupes
│       ├── OU=Groupes-Globaux
│       └── OU=Groupes-Locaux
```

---

## 2. Typologie et Étendues des Groupes Active Directory

Active Directory distingue le **type** du groupe et son **étendue** (_Group Scope_).

### 2.1. Types de groupes
- **Groupes de Sécurité (_Security Groups_)** : Disposent d'un identifiant de sécurité (**SID**). Ils peuvent être utilisés pour assigner des droits d'accès sur des ressources (fichiers, imprimantes, applications) et pour la messagerie.
- **Groupes de Distribution** : Utilisés exclusivement comme listes de diffusion de messagerie (Exchange). Ils ne possèdent pas de SID et ne peuvent pas recevoir de droits d'accès.

### 2.2. Les 3 étendues de groupes

| Étendue de groupe | Membres acceptés | Utilisable pour des droits sur | Usage type |
|---|---|---|---|
| **Groupe Global (GG)** | Utilisateurs et ordinateurs du **même domaine** uniquement | **Tous les domaines** de la forêt | Regrouper des personnes par **métier / rôle** (ex : `GG_Compta_Users`). |
| **Groupe de Domaine Local (GDL)** | Comptes, Groupes Globaux et Universels de **toute la forêt** | Ressources du **même domaine** uniquement | Représenter une **autorisation d'accès** à une ressource (ex : `GDL_Partage_Compta_Lecture`). |
| **Groupe Universel (GU)** | Comptes, Groupes Globaux et Universels de **toute la forêt** | Ressources de **tous les domaines** de la forêt | Consolider des rôles multi-domaines (nécessite le Catalogue Global). |

---

## 3. La Stratégie d'Imbrication AGDLP (Méthode de Référence SISR)

La méthode **AGDLP** est la règle d'or d'ingénierie d'administration des droits dans un domaine Active Directory :

$$\mathbf{A} \longrightarrow \mathbf{G} \longrightarrow \mathbf{DL} \longrightarrow \mathbf{P}$$

```text
+-----------------------+
|  A : Comptes (Users)  |  Ex : jdupont, mmartin (Comptables)
+-----------+-----------+
            | (Membre de)
            v
+-----------------------+
|  G : Groupes Globaux  |  Ex : GG_Comptabilite (Rôle métier)
+-----------+-----------+
            | (Membre de)
            v
+-----------------------+
| DL : Domaine Local    |  Ex : GDL_DossierCompta_Modification (Accès ressource)
+-----------+-----------+
            | (Applique les droits)
            v
+-----------------------+
|  P : Permissions NTFS |  Ex : Droits NTFS "Modifier" sur D:\Partages\Comptabilite
+-----------------------+
```

### Pourquoi respecter strictement AGDLP ?
- **Zéro utilisateur direct sur les listes de contrôle d'accès (ACL)** : On ne donne JAMAIS de permission NTFS directe à un compte utilisateur (`jdupont`).
- **Évolution simplifiée** : Lorsqu'un collaborateur change de poste, il suffit de changer son affectation de Groupe Global ; aucune ACL sur les disques ou partages n'a besoin d'être modifiée.

---

## 4. Administration Automatisée avec PowerShell (`ActiveDirectory`)

Le module PowerShell `ActiveDirectory` permet d'automatiser l'intégralité de la gestion des identités.

### 4.1. Gestion des Unités d'Organisation
```powershell
# Créer une Unité d'Organisation avec protection contre la suppression accidentelle
New-ADOrganizationalUnit `
  -Name "Comptabilite" `
  -Path "OU=Utilisateurs,OU=Entreprise,DC=opensio,DC=lan" `
  -ProtectedFromAccidentalDeletion $true
```

### 4.2. Gestion des Comptes Utilisateurs
```powershell
# Créer un compte utilisateur complet avec mot de passe initial
$password = ConvertTo-SecureString "InitialP@ss2026!" -AsPlainText -Force

New-ADUser `
  -Name "Jean Dupont" `
  -GivenName "Jean" `
  -Surname "Dupont" `
  -SamAccountName "jdupont" `
  -UserPrincipalName "jdupont@opensio.lan" `
  -Path "OU=Comptabilite,OU=Utilisateurs,OU=Entreprise,DC=opensio,DC=lan" `
  -AccountPassword $password `
  -Enabled $true `
  -ChangePasswordAtLogon $true `
  -Department "Comptabilite" `
  -Title "Comptable Fournisseurs"
```

### 4.3. Gestion des Groupes et Imbrication AGDLP
```powershell
# 1. Créer le Groupe Global métier
New-ADGroup `
  -Name "GG_Comptabilite" `
  -GroupScope Global `
  -GroupCategory Security `
  -Path "OU=Groupes-Globaux,OU=Groupes,OU=Entreprise,DC=opensio,DC=lan"

# 2. Créer le Groupe de Domaine Local d'accès
New-ADGroup `
  -Name "GDL_PartageCompta_RW" `
  -GroupScope DomainLocal `
  -GroupCategory Security `
  -Path "OU=Groupes-Locaux,OU=Groupes,OU=Entreprise,DC=opensio,DC=lan"

# 3. Imbrication : Ajouter l'utilisateur dans le Groupe Global
Add-ADGroupMember -Identity "GG_Comptabilite" -Members "jdupont"

# 4. Imbrication : Ajouter le Groupe Global dans le Groupe de Domaine Local
Add-ADGroupMember -Identity "GDL_PartageCompta_RW" -Members "GG_Comptabilite"
```

---

## 5. La Délégation d'Administration

La délégation permet à un administrateur général d'attribuer des privilèges restreints à des techniciens supports sans leur donner le rôle d'administrateur du domaine (_Domain Admins_) :
- Réinitialisation de mot de passe et déverrouillage de compte sur une UO donnée.
- Création et modification de comptes utilisateurs dans l'UO du service.
- Réalisable graphiquement via l'Assistant Délégation de contrôle de la console ADUC ou par script avec `dsacls`.
