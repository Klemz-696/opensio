---
slug: dns-dhcp-windows
title: "DNS et DHCP sous Windows Server : intégration Active Directory et haute disponibilité"
version: 1.0.0
last_reviewed: "2026-08-25"
difficulty: 3
estimated_minutes: 55
objectives:
  - "Comprendre les spécificités du rôle Serveur DNS intégré à Active Directory (AD-Integrated Zones)"
  - "Sécuriser les mises à jour dynamiques DNS (Secure Dynamic Updates) et configurer les redirecteurs conditionnels"
  - "Installer, autoriser et configurer le rôle Serveur DHCP sous Windows Server"
  - "Déployer des étendues, des filtres d'exclusion, des réservations et des options DHCP de serveur/étendue"
  - "Mettre en œuvre la haute disponibilité DHCP avec le basculement (Failover) en mode Équilibrage de charge / Veille active"
  - "Automatiser la gestion DNS et DHCP avec les modules PowerShell DnsServer et DhcpServer"
prerequisites:
  - "dns-et-dhcp"
  - "ad-ds-et-domaine"
competency_refs:
  - "B1.1"
  - "B1.2"
  - "B2.1"
success_criteria:
  - "Réussir le quiz 'DNS et DHCP sous Windows' avec au moins 80 %"
labs: []
references:
  - label: "Documentation Microsoft — Zones DNS intégrées à Active Directory"
    url: "https://learn.microsoft.com/fr-fr/windows-server/networking/dns/deploy/dns-ad-ds-integration"
  - label: "Documentation Microsoft — Basculement DHCP (DHCP Failover)"
    url: "https://learn.microsoft.com/fr-fr/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/hh831385(v=ws.11)"
---

# DNS et DHCP sous Windows Server : Intégration Active Directory et Haute Disponibilité

Sous Windows Server, les rôles **Serveur DNS** et **Serveur DHCP** sont étroitement intégrés aux services d'annuaire Active Directory. Cette intégration native garantit une réplication multi-maîtres chiffrée, une protection robuste contre l'usurpation d'adresses et une haute disponibilité transparente sans point unique de défaillance (_Single Point of Failure_).

---

## 1. Le Serveur DNS Intégré à Active Directory (AD-Integrated Zones)

Dans une architecture DNS traditionnelle, un serveur primaire détient le fichier de zone en lecture/écriture (`db.domaine`) et réplique en lecture seule vers des serveurs secondaires.

Sous Windows Server, les zones DNS peuvent être **intégrées à Active Directory** :

```text
+------------------------------------------------------------------------+
|                 RÉPLICATION DNS INTÉGRÉE ACTIVE DIRECTORY              |
|                                                                        |
|   [ DC1 / DNS 1 ] <==== Réplication Sécurisée AD ====> [ DC2 / DNS 2 ] |
|   (Lecture / Écriture)   (Kerberos + Chiffrement RPC)   (Lecture / Écriture)|
|   (Stocké dans NTDS.dit)                                (Stocké dans NTDS.dit)|
+------------------------------------------------------------------------+
```

### 1.1. Avantages majeurs des zones intégrées à AD :
1. **Modèle multi-maîtres** : N'importe quel contrôleur de domaine/DNS peut créer, modifier ou supprimer un enregistrement. La modification est automatiquement répliquée sur tous les autres contrôleurs.
2. **Sécurité accrue (Mises à jour dynamiques sécurisées uniquement)** : Seules les machines authentifiées dans le domaine Active Directory peuvent créer ou actualiser leur enregistrement DNS (prévention du détournement de noms de serveurs).
3. **Partitionnement de réplication** : Choix de la portée de réplication :
   - Tous les serveurs DNS de la forêt (`ForestDnsZones`).
   - Tous les serveurs DNS du domaine (`DomainDnsZones`).

---

## 2. Types de Zones et Résolution Avancée

- **Zone de recherche directe** : Résout les noms d'hôtes en adresses IP (enregistrements A / AAAA).
- **Zone de recherche inverse** : Résout les adresses IP en noms d'hôtes (enregistrements PTR, zone `10.168.192.in-addr.arpa`).
- **Redirecteurs (_Forwarders_)** : Serveurs DNS publics ou centraux (ex : `1.1.1.1`, `8.8.8.8`) vers lesquels rediriger les requêtes ne concernant pas les zones locales.
- **Redirecteurs conditionnels (_Conditional Forwarders_)** : Redirige spécifiquement les requêtes destinées à un domaine partenaire (ex : tout ce qui termine par `partenaire.lan` est envoyé à `10.50.0.10`).

---

## 3. Le Rôle Serveur DHCP sous Windows Server

### 3.1. L'Autorisation du Serveur DHCP dans Active Directory
> ⚠️ **Sécurité Windows** : Pour éviter qu'un utilisateur ou un serveur rogue ne distribue des adresses IP pirates, un serveur DHCP Windows membre du domaine **doit obligatoirement être autorisé dans Active Directory** par un administrateur d'entreprise (`Enterprise Admins`).
> Tant qu'il n'est pas autorisé, le service DHCP refuse de démarrer et n'émet aucune offre d'adresse.

### 3.2. Hiérarchie des Options DHCP
Les options (Passerelle, DNS, Domaine) peuvent être définies à 3 niveaux :
1. **Options de serveur** : S'appliquent à **toutes les étendues** hébergées sur le serveur (ex : serveurs DNS d'entreprise).
2. **Options d'étendue (_Scope Options_)** : S'appliquent uniquement aux clients du **sous-réseau spécifique** (ex : passerelle par défaut de ce VLAN). *Écrase les options de serveur en cas de conflit.*
3. **Options de réservation** : S'appliquent spécifiquement à une **machine unique** identifiée par sa MAC.

---

## 4. Haute Disponibilité : Le Basculement DHCP (DHCP Failover)

Le basculement DHCP (introduit nativement dans Windows Server) permet à deux serveurs DHCP de répliquer leurs baux et de sécuriser une même étendue sans recourir à un cluster complexe :

```text
[ Client DHCP ]
       |
       v
+------------------+     Synchronisation des baux      +------------------+
|  Serveur DHCP 1  | <-------------------------------> |  Serveur DHCP 2  |
|   (Partenaire)   |          (Port TCP 647)           |   (Partenaire)   |
+------------------+                                   +------------------+
```

### Deux modes de basculement :
1. **Équilibrage de charge (_Load Balance_ - Recommandé)** :
   - Les deux serveurs sont actifs simultanément sur le même sous-réseau.
   - Le trafic est réparti selon un pourcentage défini (ex : 50 % / 50 % ou 70 % / 30 %).
2. **Veille active (_Hot Standby_)** :
   - Le serveur principal traite 100 % des requêtes.
   - Le serveur secondaire prend automatiquement le relais si le serveur principal ne répond plus pendant un délai défini (_State Switchover Interval_).

---

## 5. Automatisation avec PowerShell (`DnsServer` et `DhcpServer`)

### 5.1. Administration du Serveur DNS
```powershell
# Créer un enregistrement statique A
Add-DnsServerResourceRecordA `
  -ZoneName "opensio.lan" `
  -Name "srv-fichier" `
  -IPv4Address "192.168.10.20" `
  -CreatePtr

# Créer un alias CNAME
Add-DnsServerResourceRecordCName `
  -ZoneName "opensio.lan" `
  -Name "partage" `
  -HostNameAlias "srv-fichier.opensio.lan"

# Configurer un redirecteur public
Set-DnsServerForwarder -IPAddress "1.1.1.1", "8.8.8.8"
```

### 5.2. Administration du Serveur DHCP
```powershell
# 1. Autoriser le serveur dans Active Directory
Add-DhcpServerInDC -DnsName "srv-dhcp01.opensio.lan" -IPAddress 192.168.10.10

# 2. Créer une nouvelle étendue DHCP
Add-DhcpServerv4Scope `
  -Name "VLAN10_Utilisateurs" `
  -StartRange 192.168.10.100 `
  -EndRange 192.168.10.200 `
  -SubnetMask 255.255.255.0 `
  -LeaseDuration (New-TimeSpan -Days 8) `
  -State Active

# 3. Configurer les options de l'étendue (Passerelle option 3, DNS option 6, Domaine option 15)
Set-DhcpServerv4OptionValue `
  -ScopeId 192.168.10.0 `
  -OptionId 3 -Value "192.168.10.254"

Set-DhcpServerv4OptionValue `
  -ScopeId 192.168.10.0 `
  -OptionId 6 -Value "192.168.10.10", "192.168.10.11"

Set-DhcpServerv4OptionValue `
  -ScopeId 192.168.10.0 `
  -OptionId 15 -Value "opensio.lan"

# 4. Créer une réservation statique
Add-DhcpServerv4Reservation `
  -ScopeId 192.168.10.0 `
  -IPAddress 192.168.10.50 `
  -ClientId "00-11-22-33-44-55" `
  -Name "PRN-Compta" `
  -Description "Imprimante Réseau Compta"
```
