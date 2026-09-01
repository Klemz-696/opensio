---
slug: inventaire-automatise-agents
title: "Inventaire automatisé avec GLPI Agent et découverte réseau SNMP"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 1
estimated_minutes: 50
objectives:
  - "Comprendre le fonctionnement et le protocole de communication de GLPI Agent"
  - "Déployer GLPI Agent sur postes clients Windows (MSI / GPO Active Directory) et Linux (deb/rpm)"
  - "Analyser la remontée d'inventaire matériel (CPU, RAM, disques, cartes réseaux) et logiciel (programmes installés, versions)"
  - "Configurer des tâches de découverte réseau et d'inventaire SNMP pour les équipements actifs (Switches, Routeurs, Imprimantes)"
  - "Gérer les règles d'import et de liaison automatique pour éviter les doublons dans le parc"
prerequisites:
  - "architecture-glpi-et-deploiement"
  - "reseaux-fondamentaux"
competency_refs:
  - "B1.1"
  - "B1.2"
  - "B1.5"
success_criteria:
  - "Réussir le quiz 'Inventaire Automatisé et Agents' avec au moins 80 %"
  - "Valider l'atelier 'Configuration de Tâche de Découverte Réseau et Inventaire SNMP'"
labs:
  - slug: configuration-decouverte-snmp
    required: true
references:
  - label: "GLPI Agent Documentation"
    url: "https://glpi-agent.readthedocs.io/en/latest/"
  - label: "SNMP Protocol RFC 1157 / RFC 3416"
    url: "https://datatracker.ietf.org/doc/html/rfc3416"
---

# Inventaire Automatisé avec GLPI Agent et Découverte SNMP

Maintenir à jour manuellement un fichier Excel contenant la liste de centaines d'ordinateurs, de serveurs, de commutateurs et de licences est une tâche vouée à l'échec. L'automatisation de la collecte des données via **GLPI Agent** et le protocole **SNMP** garantit une vision exacte et exhaustive du système d'information en temps réel.

---

## 1. L'Agent GLPI : Fonctionnement et Télémétrie

**GLPI Agent** est un service autonome et multiplateforme (Windows, Linux, macOS) qui s'exécute en tâche de fond sur chaque machine du parc.

```text
[ Poste Client Windows / Linux ]
  ├── 1. Collecte locale (WMI, DMI/SMBIOS, /sys, Registre, dpkg/rpm)
  ├── 2. Génération du rapport d'inventaire structuré (Format JSON)
  └── 3. Envoi sécurisé en HTTPS POST vers https://glpi.entreprise.lan/front/inventory.php
```

### 1.1. Informations Remontées Automatiquement
- **Matériel (Hardware)** : Constructeur, Modèle exact, Numéro de série (_Serial Number_), Processeur, Barrettes de RAM, Volumes disques et espace libre, Cartes réseaux avec adresses MAC et adresses IP actuelles.
- **Logiciel (Software)** : Système d'exploitation avec numéro de build/version, correctifs Windows Update installés, liste exhaustive des logiciels installés avec versions et dates d'installation.
- **Périphériques associés** : Écrans (avec n° de série et date de fabrication), imprimantes locales branchées en USB, claviers et souris.

---

## 2. Déploiement Massif de l'Agent

En entreprise, l'agent n'est jamais installé manuellement poste par poste :
- **Sous Windows** : Déploiement silencieux par Stratégie de Groupe Active Directory (GPO) ou Microsoft Intune du paquet MSI avec paramètres :
  ```powershell
  msiexec.exe /i GLPI-Agent-1.11-x64.msi /qn SERVER="https://glpi.entreprise.lan/front/inventory.php" RUNNOW=1 ADD_FIREWALL_EXCEPTION=1
  ```
- **Sous Linux** : Déploiement via Ansible ou script Bash :
  ```bash
  apt install glpi-agent
  # Fichier /etc/glpi-agent/agent.cfg :
  # server = https://glpi.entreprise.lan/front/inventory.php
  systemctl restart glpi-agent
  ```

---

## 3. Découverte Réseau et Inventaire SNMP sans Agent

Les équipements réseau (commutateurs Cisco/HP, bornes Wi-Fi, imprimantes réseau, copieurs multifonctions) ne permettent pas d'installer un agent applicatif. GLPI exploite donc le protocole **SNMP** (_Simple Network Management Protocol_) :

```text
                                +---------------------------+
                                |  SERVEUR GLPI (Serveur)   |
                                +-------------┬-------------+
                                              │ (Orchestration de la tâche)
                                              ▼
                                +---------------------------+
                                |  GLPI Agent (Proxy Réseau)|
                                +-------------┬-------------+
                                              │ (Balayage SNMP UDP 161)
                ┌─────────────────────────────┼─────────────────────────────┐
                ▼                             ▼                             ▼
       [ Commutateur Cisco ]          [ Copieur Sharp / HP ]        [ Routeur / Pare-feu ]
       - Nom d'hôte (sysName)         - Niveaux de toners           - Interfaces WAN/LAN
       - Ports et liaisons VLAN       - Compteurs de pages          - Adresses IP et MAC
       - Table ARP (Adresses MAC)     - Numéro de série             - Débit et statut UP
```

### Paramètres SNMP Indispensables :
1. **Plage d'adresses IP (IP Range)** : Ex: `192.168.10.1` à `192.168.10.254` (Sous-réseau d'administration ou bureautique).
2. **Version SNMP** :
   - **SNMP v2c** : Utilise une chaîne de communauté en clair (ex: `public` ou communauté privée d'entreprise).
   - **SNMP v3** : Chiffrement AES et authentification SHA sécurisés.
3. **Liaison automatique de ports (LLDP / CDP)** : Permet à GLPI de cartographier automatiquement quel ordinateur est physiquement branché sur quel port de quel switch réseau !
