---
slug: outils-sauvegarde-windows-veeam
title: "Sauvegardes sous Windows Server et solutions d'entreprise : VSS, System State et Veeam B&R"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 50
objectives:
  - "Comprendre l'architecture et le fonctionnement du service de clichés instantanés Windows VSS (Volume Shadow Copy Service)"
  - "Distinguer la sauvegarde au niveau fichier de la sauvegarde au niveau bloc / image (Image-level / Bare-Metal)"
  - "Comprendre la sauvegarde d'état du système Active Directory (System State Backup) et le mode DSRM"
  - "Découvrir l'architecture d'une solution de sauvegarde d'entreprise : Veeam Backup & Replication (VBR) et Proxmox Backup Server (PBS)"
  - "Maîtriser la restauration granulaire au niveau application (Item-Level Recovery : e-mail Exchange, objet AD, base SQL)"
prerequisites:
  - "windows-server-ad"
  - "strategie-sauvegarde-3-2-1"
competency_refs:
  - "B1.1"
  - "B2.3"
  - "B3.4"
success_criteria:
  - "Réussir le quiz 'Sauvegarde Windows et Veeam' avec au moins 80 %"
labs: []
references:
  - label: "Microsoft Learn — Volume Shadow Copy Service (VSS) Architecture"
    url: "https://learn.microsoft.com/en-us/windows/win32/vss/volume-shadow-copy-service-portal"
  - label: "Veeam Help Center — Veeam Backup & Replication User Guide"
    url: "https://helpcenter.veeam.com/docs/backup/vsphere/overview.html"
---

# Sauvegardes Windows Server et Solutions d'Entreprise : VSS et Veeam

Dans les parcs informatiques d'entreprise, la majorité des serveurs de production hébergent des bases de données transactionnelles ouvertes et actives 24h/24 (Active Directory NTDS.dit, Microsoft SQL Server, serveurs de messagerie). Sauvegarder des fichiers ouverts sans mécanisme de cohérence mènerait inévitablement à des données corrompues et inexploitables.

---

## 1. Le Moteur de Cohérence Windows : VSS (_Volume Shadow Copy Service_)

**VSS** est le service d'orchestration intégré à Windows Server permettant de créer un instantané (_Snapshot_) cohérent d'un volume en quelques millisecondes, sans interrompre les applications ni déconnecter les utilisateurs.

```text
+-------------------------------------------------------------------------------+
|                       Architecture de Cliché Instantané VSS                   |
+-------------------------------------------------------------------------------+
| 1. VSS Requester  : L'application de sauvegarde (Veeam, Windows Server Backup) |
|                     déclenche la demande de sauvegarde.                       |
+-------------------------------------------------------------------------------+
| 2. VSS Writer     : Les composants applicatifs (Active Directory NTDS Writer,  |
|                     SQL Writer, Exchange Writer) figent temporairement leurs  |
|                     transactions en mémoire vive pour vider les caches.       |
+-------------------------------------------------------------------------------+
| 3. VSS Provider   : Le pilote de stockage (logiciel ou matériel SAN) crée le  |
|                     cliché instantané du volume (Copy-on-Write).              |
+-------------------------------------------------------------------------------+
| 4. Déblocage      : Les applications reprennent leurs écritures normales ;     |
|                     le Requester lit les données stables depuis le Snapshot.  |
+-------------------------------------------------------------------------------+
```

---

## 2. Sauvegarde de l'État du Système (_System State Backup_)

Sur un Contrôleur de Domaine Windows Server, la sauvegarde des fichiers seuls ne suffit pas. La sauvegarde de **l'état du système (_System State_)** englobe :
- La base de données Active Directory (`C:\Windows\NTDS\ntds.dit`) et ses journaux de transactions (`edb.log`).
- Le dossier partagé `SYSVOL` (contenant les scripts de connexion et les stratégies de groupe GPO).
- Le registre Windows (`HKLM\SAM`, `HKLM\SECURITY`, `HKLM\SYSTEM`, `HKLM\SOFTWARE`).
- La base de données de certificats de l'Autorité de Certification (AD CS) et la zone DNS Active Directory.

### Commande PowerShell / Wbadmin :
```powershell
# Sauvegarder l'état du système vers le lecteur de sauvegarde dédié E:
wbadmin start systemstatebackup -backupTarget:E: -quiet
```

### Restauration Active Directory :
Pour restaurer un contrôleur de domaine, l'administrateur doit redémarrer le serveur en mode **DSRM** (_Directory Services Restore Mode_) avec le mot de passe défini lors de la promotion du contrôleur.

---

## 3. Architecture d'une Solution d'Entreprise : Veeam Backup & Replication

**Veeam Backup & Replication (VBR)** est la solution de référence pour la sauvegarde sans agent (_Agentless_) des environnements virtualisés (VMware vSphere, Microsoft Hyper-V, Proxmox VE) :

```text
[ Console VBR ] ──► [ Backup Proxy ] ──► [ Hyperviseur ESXi / Hyper-V ]
                          │                       │ (Lecture blocs via CBT)
                          ▼                       ▼
               [ Backup Repository ] ◄─── (Fichiers .VBK / .VIB dédupliqués)
```

### 1. Composants Clés de Veeam :
- **Backup Server** : Cerveau central qui planifie les tâches et gère la base de données de configuration.
- **Backup Proxy** : Rôle qui récupère les données des VMs depuis l'hyperviseur, les compresse, les déduplique et les transmet au dépôt.
- **Backup Repository** : Espace de stockage sécurisé hébergeant les points de sauvegarde (fichiers `.vbk` complets et `.vib` incrémentaux).
- **Hardened Repository (Linux Immuable)** : Serveur de stockage Linux utilisant les attributs immuables (`chattr +i` / XFS) avec accès restreint sans SSH pour contrer les ransomwares.

---

## 4. Technologies Clés de Sauvegarde Virtualisée

1. **CBT (_Changed Block Tracking_)** :
   L'hyperviseur conserve un journal des blocs de disque modifiés depuis la dernière sauvegarde. Lors de l'incrémentale, le proxy Veeam ne lit que les blocs altérés (ex: 500 Mo sur un disque de 100 Go), réduisant la durée de sauvegarde à quelques dizaines de secondes.
2. **Instant VM Recovery (Restauration Instantanée)** :
   Veeam démarre une machine virtuelle directement **depuis le fichier de sauvegarde compressé** sur le stockage de backup (en publiant un datastore NFS éphémère à l'hyperviseur). La VM est disponible pour les utilisateurs en **moins de 2 minutes**, puis migrée à chaud en arrière-plan vers le stockage de production via Storage vMotion.
3. **Restauration Granulaire (_Item-Level Recovery_)** :
   Les explorateurs Veeam permettent d'extraire un objet unique sans restaurer toute la VM (ex: restaurer un seul e-mail supprimé dans Exchange, une table SQL ou un compte utilisateur avec son mot de passe dans Active Directory).
