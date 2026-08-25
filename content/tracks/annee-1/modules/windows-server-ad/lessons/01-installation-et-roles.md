---
slug: windows-installation-roles
title: "Windows Server : installation, éditions, rôles et fonctionnalités"
version: 1.0.0
last_reviewed: "2026-08-25"
difficulty: 2
estimated_minutes: 50
objectives:
  - "Distinguer les éditions de Windows Server (Standard vs Datacenter, Desktop Experience vs Server Core)"
  - "Comprendre la différence entre un rôle serveur, un service de rôle et une fonctionnalité"
  - "Déployer et administrer des rôles via le Gestionnaire de Serveur et PowerShell"
  - "Maîtriser les outils d'administration à distance (RSAT, Windows Admin Center, SSH, PowerShell Remoting / WinRM)"
  - "Appliquer les étapes de configuration post-installation indispensables d'un serveur d'infrastructure"
prerequisites:
  - "modeles-osi-tcpip"
competency_refs:
  - "B1.1"
  - "B1.2"
success_criteria:
  - "Réussir le quiz 'Windows Server : Installation et Rôles' avec au moins 80 %"
labs: []
references:
  - label: "Documentation Microsoft — Vue d'ensemble de Windows Server"
    url: "https://learn.microsoft.com/fr-fr/windows-server/get-started/windows-server-overview"
  - label: "Documentation Microsoft — Options d'installation Server Core"
    url: "https://learn.microsoft.com/fr-fr/windows-server/administration/server-core/what-is-server-core"
---

# Windows Server : Installation, Éditions, Rôles et Fonctionnalités

**Windows Server** est le système d'exploitation serveur de référence pour les environnements d'entreprise Microsoft. Il fournit l'ensemble des services d'annuaire (Active Directory), de réseau (DNS, DHCP), de stockage, de virtualisation (Hyper-V) et de sécurité nécessaires à la gestion centralisée d'un parc informatique.

---

## 1. Les Éditions de Windows Server

Microsoft propose principalement deux éditions majeures pour les déploiements d'entreprise :

| Caractéristique | Windows Server Standard | Windows Server Datacenter |
|---|---|---|
| **Périmètre cible** | Environnements physiques ou faiblement virtualisés | Environnements hautement virtualisés et clouds privés |
| **Droits de virtualisation (OSE)** | **2 Machines Virtuelles** (ou conteneurs Hyper-V isolés) par licence complète de cœur | **Machines Virtuelles illimitées** sur l'hôte sous licence |
| **Fonctionnalités avancées** | Non incluses | Espaces de stockage direct (_Storage Spaces Direct - S2D_), Réseau SDN (_Software-Defined Networking_), Réplication de stockage illimitée (_Storage Replica_) |
| **Modèle de licence** | Par cœur physique (minimum 16 cœurs par serveur) | Par cœur physique (minimum 16 cœurs par serveur) |

---

## 2. Options d'Installation : Server Core vs Desktop Experience

Lors de l'installation du système, l'administrateur doit choisir entre deux modes d'exploitation :

### 2.1. Server Core (Recommandé en production)
- **Interface graphique (GUI) absente** : Le serveur démarre uniquement sur une invite de commande et PowerShell.
- **Avantages majeurs** :
  - **Surface d'attaque drastiquement réduite** : Moins de binaires et de bibliothèques exposés.
  - **Empreinte mémoire et disque minimale** : Consomme moins de 1 Go de RAM au repos et nécessite ~10 Go d'espace disque.
  - **Moins de redémarrages** : Moins de mises à jour de sécurité (Windows Update) requises.
- **Administration** : À distance via PowerShell Remoting (WinRM), Windows Admin Center, RSAT ou l'utilitaire local `sconfig`.

### 2.2. Server with Desktop Experience (Expérience utilisateur)
- Fournit l'interface graphique Windows classique avec le Gestionnaire de Serveur (_Server Manager_) et les consoles MMC.
- Recommandé pour les serveurs hôtes de session Bureau à distance (RDS) ou pour l'apprentissage des consoles.

---

## 3. Architecture des Composants : Rôles vs Fonctionnalités

Dans Windows Server, les services sont modulaires et découpés en trois niveaux :

```text
+-------------------------------------------------------------------+
|                        RÔLE SERVEUR                               |
|        (Ex : Services de domaine Active Directory - AD DS)        |
|                                                                   |
|   +----------------------------+  +---------------------------+   |
|   |    SERVICE DE RÔLE 1       |  |    SERVICE DE RÔLE 2      |   |
|   | (Contrôleur de domaine)    |  | (Serveur de licences AD)  |   |
|   +----------------------------+  +---------------------------+   |
+-------------------------------------------------------------------+

+-------------------------------------------------------------------+
|                       FONCTIONNALITÉ                              |
|       (Ex : Clustering de basculement, Sauvegarde Windows, WINS)  |
+-------------------------------------------------------------------+
```

1. **Rôle serveur (_Server Role_)** : Fonction principale assurée par le serveur au sein du système d'information (ex : AD DS, Serveur DNS, Serveur DHCP, Hyper-V, Serveur Web IIS, Services de fichiers).
2. **Service de rôle (_Role Service_)** : Sous-composant optionnel d'un rôle (ex : pour le rôle Services d'accès et de stratégie réseau : Serveur RADIUS NPS).
3. **Fonctionnalité (_Feature_)** : Outil logiciel ou protocole transverse améliorant ou complétant les capacités du serveur (ex : Sauvegarde Windows Server, Gestionnaire du chiffrement BitLocker, Clustering avec basculement, Outils d'administration RSAT).

---

## 4. Gestion et Déploiement avec PowerShell

L'automatisation via PowerShell est la méthode privilégiée en administration SISR moderne.

### Commandes fondamentales du module `ServerManager` :

```powershell
# Lister tous les rôles et fonctionnalités disponibles et installés
Get-WindowsFeature

# Filtrer les rôles installés sur le serveur local
Get-WindowsFeature | Where-Object { $_.Installed -eq $true }

# Installer le rôle Serveur DNS avec ses outils de gestion graphique
Install-WindowsFeature -Name DNS -IncludeManagementTools

# Installer le rôle Serveur DHCP sans redémarrage automatique
Install-WindowsFeature -Name DHCP -IncludeManagementTools -Restart:$false

# Installer le rôle AD DS
Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools

# Supprimer un rôle ou une fonctionnalité obsolète
Uninstall-WindowsFeature -Name Telnet-Client
```

---

## 5. Configuration Post-Installation Indispensable

Avant de promouvoir un serveur en contrôleur de domaine ou de lui assigner des rôles critiques, l'administrateur doit obligatoirement réaliser la séquence suivante :

1. **Attribution d'un nom d'hôte normalisé** : Renommer la machine (ex : `SRV-DC01` ou `SRV-FILE01`) via `Rename-Computer -NewName SRV-DC01 -Restart`.
2. **Configuration d'une adresse IPv4 statique** : Un serveur d'infrastructure ne doit jamais dépendre d'un bail DHCP dynamique.
3. **Configuration du fuseau horaire et de la synchronisation d'horloge (NTP)** : Crucial pour le fonctionnement de Kerberos (écart maximal toléré : 5 minutes).
4. **Activation de l'administration à distance (WinRM)** : `Enable-PSRemoting -Force`.
5. **Exécution des mises à jour Windows Update** : Assurer la conformité des correctifs de sécurité.

---

## 6. Outils d'Administration à Distance

- **RSAT (Remote Server Administration Tools)** : Ensemble de consoles MMC (ADUC, DNS, DHCP, GPMC) installées sur le poste de travail Windows 10/11 de l'administrateur.
- **Windows Admin Center (WAC)** : Interface web moderne de gestion centralisée (certificats, stockage, performances, pare-feu).
- **PowerShell Remoting (WinRM - ports 5985 HTTP / 5986 HTTPS)** : Exécution de commandes et sessions interactives distantes :
  ```powershell
  # Ouvrir une session interactive sur un serveur distant
  Enter-PSSession -ComputerName SRV-DC01 -Credential (Get-Credential)

  # Exécuter un script sur plusieurs serveurs simultanément
  Invoke-Command -ComputerName SRV-DC01, SRV-FILE01 -ScriptBlock { Get-Service Spooler }
  ```
