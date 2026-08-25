---
slug: ad-ds-et-domaine
title: "Active Directory Domain Services (AD DS) : forêt, domaine et contrôleurs"
version: 1.0.0
last_reviewed: "2026-08-25"
difficulty: 3
estimated_minutes: 60
objectives:
  - "Comprendre les concepts fondamentaux d'un annuaire d'entreprise (LDAP, Kerberos)"
  - "Maîtriser la hiérarchie logique d'Active Directory (Forêt, Arbre, Domaine, Unité d'Organisation)"
  - "Identifier les composants physiques : Contrôleur de Domaine (DC), base NTDS.dit, dossier SYSVOL"
  - "Connaître le rôle du Catalogue Global (GC) et les 5 rôles de maîtres d'opérations FSMO"
  - "Automatiser la promotion d'un contrôleur de domaine via PowerShell (Install-ADDSForest)"
  - "Comprendre l'interdépendance critique entre Active Directory et le serveur DNS"
prerequisites:
  - "windows-installation-roles"
  - "dns-et-dhcp"
competency_refs:
  - "B1.1"
  - "B1.2"
  - "B2.1"
success_criteria:
  - "Réussir le quiz 'AD DS et Domaine' avec au moins 80 %"
  - "Compléter l'atelier pratique 'Promotion d'un contrôleur de domaine'"
labs:
  - slug: promotion-controleur-domaine
    required: true
references:
  - label: "Documentation Microsoft — Vue d'ensemble des services de domaine Active Directory"
    url: "https://learn.microsoft.com/fr-fr/windows-server/identity/ad-ds/get-started/virtual-dc/active-directory-domain-services-overview"
  - label: "Documentation Microsoft — Installer une nouvelle forêt Active Directory avec PowerShell"
    url: "https://learn.microsoft.com/fr-fr/powershell/module/addsdeployment/install-addsforest"
---

# Active Directory Domain Services (AD DS) : Forêt, Domaine et Contrôleurs

**Active Directory Domain Services (AD DS)** est le service d'annuaire centralisé de Microsoft. Il stocke les informations relatives aux identités du réseau (utilisateurs, ordinateurs, groupes, imprimantes) et fournit les services d'authentification (**Kerberos v5** / **NTLM**) et d'autorisation nécessaires au contrôle d'accès dans une infrastructure d'entreprise.

---

## 1. La Hiérarchie Logique d'Active Directory

Active Directory organise logiquement les ressources selon une arborescence à quatre niveaux :

```text
+---------------------------------------------------------------+
|                            FORÊT                              |
|           (Périmètre de sécurité ultime / Schéma unique)       |
|                                                               |
|   +-------------------------------------------------------+   |
|   |                        ARBRE                          |   |
|   |             (Espace de noms DNS contigu)              |   |
|   |                                                       |   |
|   |   [ Domaine Racine : opensio.lan ]                    |   |
|   |            |                                          |   |
|   |   [ Domaine Enfant : agence.opensio.lan ]             |   |
|   +-------------------------------------------------------+   |
+---------------------------------------------------------------+
```

1. **La Forêt (_Forest_)** :
   - C'est le **périmètre de sécurité ultime** d'Active Directory.
   - Tous les domaines d'une même forêt partagent un **Schéma unique** (définition de toutes les classes d'objets et attributs), une **Configuration unique** et un **Catalogue Global**.
2. **L'Arbre (_Tree_)** :
   - Ensemble d'un ou plusieurs domaines partageant un **espace de noms DNS contigu** (ex : `opensio.lan` et `agence.opensio.lan`).
3. **Le Domaine (_Domain_)** :
   - Unité administrative fondamentale de gestion des stratégies de sécurité et des réplications de données.
   - Les objets d'un domaine partagent la même politique de mots de passe par défaut.
4. **L'Unité d'Organisation (UO / _Organizational Unit_)** :
   - Conteneur logique permettant de regrouper des objets (utilisateurs, machines) au sein d'un domaine afin de leur appliquer des stratégies de groupe (GPO) ou de déléguer leur gestion à des techniciens.

---

## 2. Les Composants Physiques d'Active Directory

### 2.1. Le Contrôleur de Domaine (DC — Domain Controller)
Un serveur exécutant le rôle AD DS qui détient une copie répliquée de la base de données de l'annuaire et assure l'authentification des clients.

### 2.2. La Base de Données `NTDS.dit` et les Journaux
- **Fichier de base de données** : `C:\Windows\NTDS\ntds.dit` (base relationnelle au format ESE — Extensible Storage Engine).
- **Journaux de transactions** : `edb.log`, `edbtmp.log` (garantissent la cohérence ACID des transactions).

### 2.3. Le Répertoire Partagé `SYSVOL`
- Répertoire répliqué sur tous les contrôleurs de domaine via **DFSR** (_Distributed File System Replication_).
- Emplacement : `C:\Windows\SYSVOL\sysvol\<nom-domaine>\`.
- Stocke les **scripts d'ouverture de session** (`scripts/`) et les fichiers de définition des **Stratégies de Groupe** (`Policies/`).

---

## 3. Le Catalogue Global (GC — Global Catalog)

Le Catalogue Global est une fonction hébergée sur un ou plusieurs contrôleurs de domaine qui conserve :
- Une **copie complète en lecture/écriture** de tous les objets de son propre domaine.
- Une **copie partielle en lecture seule** (attributs les plus fréquemment recherchés : prénom, nom, login, email) de **tous les objets de tous les domaines de la forêt**.

> 💡 **Rôle clé** : Il est indispensable lors de la connexion utilisateur pour déterminer l'appartenance aux **Groupes Universels** dans un environnement multi-domaines.

---

## 4. Les 5 Rôles de Maîtres d'Opérations (FSMO)

Bien qu'Active Directory fonctionne selon un modèle multimaître (n'importe quel DC peut créer un compte utilisateur et répliquer la modification), 5 opérations critiques nécessitent un contrôle unique pour éviter tout conflit (**FSMO** — _Flexible Single Master Operations_) :

| Niveau de portée | Rôle FSMO | Description et Rôle |
|---|---|---|
| **Forêt (1 par forêt)** | **Maître de schéma** (_Schema Master_) | Gère et autorise les modifications structurelles du schéma de la forêt (ex : extension pour Exchange Server). |
| **Forêt (1 par forêt)** | **Maître d'attribution des noms de domaine** (_Domain Naming Master_) | Contrôle l'ajout ou la suppression de domaines dans la forêt. |
| **Domaine (1 par domaine)** | **Émulateur PDC** (_PDC Emulator_) | Serveur d'horloge de référence NTP pour le domaine, gestion des verrouillages de compte, rétro-compatibilité NTLM. |
| **Domaine (1 par domaine)** | **Maître RID** (_Relative ID Master_) | Distribue des blocs d'identifiants relatifs (RID pools de 500) à chaque DC pour garantir l'unicité des SID (`SID = Domain SID + RID`). |
| **Domaine (1 par domaine)** | **Maître d'infrastructure** (_Infrastructure Master_) | Met à jour les références inter-domaines (ex : utilisateur d'un domaine membre d'un groupe d'un autre domaine). |

---

## 5. L'Interdépendance Critique avec le Serveur DNS

Active Directory ne peut pas fonctionner sans un serveur DNS opérationnel :
- Les clients localisent les contrôleurs de domaine, le Catalogue Global et les services Kerberos/LDAP via des **enregistrements de service DNS (SRV)** stockés dans la zone `_msdcs.<nom-domaine>`.
- **Enregistrements SRV critiques** :
  - `_ldap._tcp.dc._msdcs.<domaine>` (port 389)
  - `_kerberos._tcp.dc._msdcs.<domaine>` (port 88)
  - `_gc._tcp.<domaine>` (port 3268)

---

## 6. Automatisation du Déploiement d'un Contrôleur de Domaine (PowerShell)

### Étape 1 : Installer les fichiers binaires du rôle AD DS
```powershell
Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools
```

### Étape 2 : Promouvoir le serveur en nouveau contrôleur de domaine (Création de forêt)
```powershell
# Importation du module de déploiement AD DS
Import-Module ADDSDeployment

# Définition du mot de passe DSRM (Restauration d'annuaire sécurisée)
$dsrmPassword = ConvertTo-SecureString "P@ssw0rdDSRM!2026" -AsPlainText -Force

# Promotion et création de la nouvelle forêt d'entreprise
Install-ADDSForest `
  -DomainName "opensio.lan" `
  -DomainNetbiosName "OPENSIO" `
  -DomainMode "WinThreshold" `
  -ForestMode "WinThreshold" `
  -DatabasePath "C:\Windows\NTDS" `
  -LogPath "C:\Windows\NTDS" `
  -SysvolPath "C:\Windows\SYSVOL" `
  -InstallDns:$true `
  -SafeModeAdministratorPassword $dsrmPassword `
  -CreateDnsDelegation:$false `
  -NoRebootOnCompletion:$false `
  -Force:$true
```

### Étape 3 : Vérification post-déploiement
```powershell
# Vérifier l'état de santé du contrôleur de domaine
dcdiag /v

# Vérifier les détenteurs des 5 rôles FSMO
Get-ADForest | Select-Object SchemaMaster, DomainNamingMaster
Get-ADDomain | Select-Object PDCEmulator, RIDMaster, InfrastructureMaster
```
