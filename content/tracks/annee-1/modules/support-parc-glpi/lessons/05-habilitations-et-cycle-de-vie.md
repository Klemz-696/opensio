---
slug: habilitations-et-cycle-de-vie
title: "Gestion des habilitations, profils utilisateurs et cycle de vie des actifs (ITAM)"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 1
estimated_minutes: 45
objectives:
  - "Comprendre la gestion du cycle de vie des actifs informatiques ITAM (IT Asset Management)"
  - "Maîtriser les étapes de vie d'un matériel : Réception, En stock, En service, En réparation, Réformé (D3E)"
  - "Suivre les contrats de garantie, maintenance et amortissement comptable du parc informatique"
  - "Gérer le cycle de vie des licences logicielles (OEM, Volume, SaaS/Abonnement) et la conformité aux audits"
  - "Lier GLPI à un annuaire d'entreprise Active Directory / OpenLDAP avec synchronisation des groupes et profils"
prerequisites:
  - "architecture-glpi-et-deploiement"
  - "windows-server-ad"
competency_refs:
  - "B1.1"
  - "B1.2"
  - "B1.5"
success_criteria:
  - "Réussir le quiz 'Habilitations et Cycle de Vie' avec au moins 80 %"
labs: []
references:
  - label: "GLPI Asset Management Guide"
    url: "https://glpi-user-documentation.readthedocs.io/fr/latest/modules/assets/index.html"
  - label: "ANSSI — Gestion des habilitations et du cycle de vie des comptes"
    url: "https://cyber.gouv.fr/bonnes-pratiques"
---

# Gestion des Habilitations, Profils et Cycle de Vie des Actifs (ITAM)

La gestion de parc ne se résume pas à savoir où se trouve un ordinateur : elle englobe le suivi juridique, financier et sécuritaire de chaque équipement et de chaque utilisateur depuis son arrivée jusqu'à son départ de l'entreprise.

---

## 1. Cycle de Vie Complet d'un Actif Informatique

Chaque matériel (PC, serveur, écran, smartphone) possède un statut d'état dans GLPI qui évolue tout au long de sa durée de détention :

```text
  [ 1. COMMANDE / RÉCEPTION ] ──► [ 2. EN STOCK / PRÉPARATION ] ──► [ 3. EN SERVICE (Assigné) ]
        (Bon de livraison,                (Masterisation OS,             (Affecté à un utilisateur
         N° de série, Facture)             Étiquetage code-barre)         avec fiche de prêt signée)
                                                                                  │
                                                                   ┌──────────────┴──────────────┐
                                                                   ▼                             ▼
                                                        [ 4. EN RÉPARATION ]           [ 5. RÉFORMÉ / RECYCLÉ ]
                                                         (Garantie constructeur,        (Effacement sécurisé DoD,
                                                          Prêt matériel relais)          Filière D3E certifiée)
```

### Obligations RSE et Sécurité lors de la Réforme :
- **Effacement sécurisé des données** : Obligation RGPD et cybersécurité de détruire ou d'effacer magnétiquement les disques durs (norme NIST 800-88 / DoD 5220.22-M) avant tout don ou mise au rebut.
- **Filière D3E (_Déchets d'Équipements Électriques et Électroniques_)** : Traçabilité environnementale avec obtention d'un bordereau de suivi des déchets dangereux (BSDD).

---

## 2. Gestion des Licences Logicielles et Conformité

Pour éviter les amendes lourdes lors des audits éditeurs (Microsoft SAM, Adobe, Oracle), GLPI offre un module complet de gestion des licences :

| Type de Licence | Principe & Comptabilisation | Risque de non-conformité |
|---|---|---|
| **OEM (_Original Equipment Manufacturer_)** | Liée physiquement et définitivement à la carte mère de la machine à l'achat. | Non transférable sur un nouveau PC. |
| **Volume / Retail (Per-Device / Per-User)** | Pack de licences d'entreprise (ex: 100 licences Office Pro). | Dépassement du nombre de postes installés par rapport aux licences achetées (_Over-licensing_ / _Under-licensing_). |
| **Abonnement SaaS (Cloud)** | Facturation mensuelle par utilisateur actif (Microsoft 365, Google Workspace). | Continuer à payer des licences pour d'anciens collaborateurs partis de l'entreprise. |

---

## 3. Liaison avec l'Annuaire d'Entreprise Active Directory / LDAP

Dans un réseau d'entreprise, les utilisateurs et les techniciens ne sont jamais créés manuellement dans GLPI : ils sont synchronisés directement depuis l'annuaire **Active Directory** :

```text
[ Active Directory Windows Server ]                [ Serveur GLPI ]
  - Utilisateur : Lucas DUPONT                       - Compte utilisateur synchronisé
  - Membre du groupe AD : "GG_SUPPORT_N1"  ──► LDAP ──► - Profil GLPI attribué : "Technician"
  - Service : "Informatique"                         - Entité assignée : "Siège Social"
```

### Paramètres de Liaison LDAP dans GLPI :
- **Hôte LDAP** : `ldaps://dc1.entreprise.lan:636` (LDAP sécurisé sur TLS).
- **BaseDN** : `DC=entreprise,DC=lan`.
- **Filtre de connexion** : `(&(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))` (Exclut les comptes désactivés).
- **Attributs de correspondance** :
  - Identifiant : `samaccountname`
  - Nom / Prénom : `sn` / `givenname`
  - E-mail : `mail`
  - Téléphone : `telephonenumber`
