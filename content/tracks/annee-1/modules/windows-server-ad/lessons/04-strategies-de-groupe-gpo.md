---
slug: strategies-de-groupe-gpo
title: "Stratégies de groupe (GPO) : architecture, ordre d'application et dépannage"
version: 1.0.0
last_reviewed: "2026-08-25"
difficulty: 3
estimated_minutes: 60
objectives:
  - "Comprendre l'architecture et les composants d'un objet de stratégie de groupe (GPC dans AD, GPT dans SYSVOL)"
  - "Maîtriser l'ordre d'application hiérarchique LSDOU et la résolution des conflits"
  - "Distinguer les sections Configuration Ordinateur et Configuration Utilisateur"
  - "Configurer le blocage de l'héritage, l'application forcée (Enforced) et le filtrage de sécurité"
  - "Utiliser le ciblage au niveau de l'élément (Item-level targeting) dans les préférences de stratégie de groupe (GPP)"
  - "Diagnostiquer et dépanner l'application des GPO avec gpupdate, gpresult et RSOP"
prerequisites:
  - "ad-ds-et-domaine"
  - "utilisateurs-groupes-uo"
competency_refs:
  - "B1.1"
  - "B1.2"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Stratégies de Groupe (GPO)' avec au moins 80 %"
labs: []
references:
  - label: "Documentation Microsoft — Vue d'ensemble des stratégies de groupe"
    url: "https://learn.microsoft.com/fr-fr/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/hh831791(v=ws.11)"
  - label: "Documentation Microsoft — Dépannage de l'application des stratégies de groupe"
    url: "https://learn.microsoft.com/fr-fr/troubleshoot/windows-client/group-policy/group-policy-overview"
---

# Stratégies de Groupe (GPO) : Architecture, Ordre d'Application et Dépannage

Les **Stratégies de Groupe** (**GPO** — _Group Policy Objects_) constituent le mécanisme central de gestion des configurations, du durcissement de la sécurité et du déploiement automatisé d'environnements de travail sous Windows. Elles permettent de standardiser les paramètres de milliers de postes clients et serveurs depuis une console d'administration unique.

---

## 1. Architecture d'un Objet de Stratégie de Groupe (GPO)

Un objet GPO est scindé en deux composants distincts stockés à deux emplacements physiques différents :

```text
+------------------------------------------------------------------------+
|                          OBJET GPO COMPLET                             |
|                                                                        |
|   +--------------------------------+  +----------------------------+   |
|   |    GPC (Group Policy Container)|  | GPT (Group Policy Template)|   |
|   |    Stocké dans Active Directory|  | Stocké dans le dossier     |   |
|   |    (CN=Policies,CN=System...)  |  | SYSVOL (Partage réseau)    |   |
|   |    Contient : GUID, Statut,    |  | Contient : Fichiers .pol,  |   |
|   |    Version, Numéro de révision |  | Scripts, Fichiers XML      |   |
|   +--------------------------------+  +----------------------------+   |
+------------------------------------------------------------------------+
```

1. **Le GPC (_Group Policy Container_)** :
   - Stocké dans l'annuaire Active Directory (`CN=Policies,CN=System,DC=opensio,DC=lan`).
   - Contient les métadonnées de la stratégie : identifiant unique (**GUID**), numéro de version, extensions de stratégie clientes activées.
2. **Le GPT (_Group Policy Template_)** :
   - Dossier physique répliqué situé dans `\\<domaine>\SYSVOL\<domaine>\Policies\{GUID}\`.
   - Contient les fichiers réels de configuration : `registry.pol` (paramètres du registre), `gpt.ini` (numéro de version du template), scripts et préférences.

> ⚠️ **Condition de cohérence** : Un client n'applique la GPO que si le numéro de version stocké dans le GPC (Active Directory) correspond exactement au numéro de version inscrit dans le fichier `gpt.ini` du GPT (SYSVOL).

---

## 2. Les Deux Branches d'une GPO

Chaque stratégie est divisée en deux sections autonomes :

| Section | Cible | Moment d'application | Exemples de paramètres |
|---|---|---|---|
| **Configuration Ordinateur** | Objets Ordinateurs rattachés au conteneur | Au **démarrage** de la machine (avant l'ouverture de session) | Stratégies de mots de passe, Pare-feu Windows, Désactivation de services, Configuration Windows Update |
| **Configuration Utilisateur** | Objets Utilisateurs rattachés au conteneur | À l'**ouverture de session** de l'utilisateur | Mappage de lecteurs réseau, Fond d'écran, Redirection de dossiers (Documents, Bureau), Paramètres de navigateur |

---

## 3. L'Ordre d'Application Hiérarchique : La Règle LSDOU

L'ordre dans lequel les stratégies sont traitées détermine quel paramètre l'emporte en cas de conflit. L'application suit strictement l'acronyme **LSDOU** :

$$\mathbf{L} \longrightarrow \mathbf{S} \longrightarrow \mathbf{D} \longrightarrow \mathbf{OU}$$

```text
1. [L] Local              (Stratégie de sécurité locale de la machine)
      |
2. [S] Site               (Site Active Directory physique)
      |
3. [D] Domaine            (GPO liée à la racine du domaine, ex : Default Domain Policy)
      |
4. [OU] Unité d'Org       (GPO liée aux UO parentes puis UO enfants)
```

### Règle d'or de résolution des conflits :
> **Le dernier paramètre appliqué écrase les précédents.**
> Une GPO liée à une UO fille a donc la priorité sur une GPO liée au niveau du Domaine ou d'une UO parente.

---

## 4. Exceptions et Mécanismes de Contrôle de Portée

Pour adapter l'héritage standard, l'administrateur dispose de 4 leviers :

### 4.1. Bloquer l'héritage (_Block Inheritance_)
Configuré sur une Unité d'Organisation, il empêche toutes les GPOs situées plus haut dans l'arborescence (Site, Domaine, UO parentes) de s'appliquer à cette UO et à ses enfants.

### 4.2. Application Forcée (_Enforced / Appliquée_)
Configuré sur un lien de GPO spécifique (ex : la politique de sécurité globale de l'entreprise) :
- La GPO s'applique **même si une UO fille a activé le blocage de l'héritage**.
- En cas de conflit avec une autre GPO d'une UO fille, la GPO « Enforced » **l'emporte toujours**.

### 4.3. Filtrage de Sécurité (_Security Filtering_)
Par défaut, une GPO s'applique au groupe `Utilisateurs authentifiés` (_Authenticated Users_). L'administrateur peut restreindre l'application d'une GPO à un groupe de sécurité spécifique (ex : `GG_Comptabilite`) en lui accordant les droits `Lire` et `Appliquer la stratégie de groupe`.

### 4.4. Ciblage au Niveau de l'Élément (_Item-Level Targeting_ dans les GPP)
Disponible dans les **Préférences de stratégie de groupe** (GPP) : permet de conditionner l'application d'un paramètre unitaire (ex : mapper le lecteur `Z:` uniquement si la machine est un ordinateur portable ET que l'utilisateur appartient au groupe `GG_Nomades`).

---

## 5. Politiques (Policies) vs Préférences (Preferences - GPP)

| Caractéristique | Stratégies classiques (Policies) | Préférences de stratégie (GPP) |
|---|---|---|
| **Verrouillage utilisateur** | Les paramètres sont verrouillés et grisés dans l'interface utilisateur | L'utilisateur peut modifier la valeur si ses droits le permettent |
| **Comportement à la suppression de GPO** | Tatouage évité : le paramètre système revient à son état d'origine | Le paramètre reste configuré (tatouage persistant / _tattooing_) |
| **Gestion des lecteurs et imprimantes** | Limitée | Très puissante (Créer, Remplacer, Mettre à jour, Supprimer) |

---

## 6. Commandes Indispensables de Dépannage et Diagnostic

Sur le poste client ou le serveur membre :

```powershell
# Forcer l'actualisation immédiate de toutes les stratégies (sans attendre le cycle de 90 min)
gpupdate /force

# Générer un rapport en mode texte des GPO appliquées à la machine et à l'utilisateur courant
gpresult /r

# Exporter un rapport HTML complet et détaillé de l'ensemble des paramètres appliqués
gpresult /h C:\RapportGPO.html

# Exécuter l'analyse du jeu de stratégie résultant (RSOP)
rsop.msc
```

### Sous PowerShell avec le module `GroupPolicy` :
```powershell
# Créer une nouvelle GPO
New-GPO -Name "GPO_Securite_Postes" -Comment "Durcissement des postes clients"

# Lier la GPO à une Unité d'Organisation
New-GPLink -Name "GPO_Securite_Postes" -Target "OU=Ordinateurs,OU=Entreprise,DC=opensio,DC=lan"

# Sauvegarder toutes les GPO du domaine
Backup-GPO -All -Path "C:\BackupGPO"
```
