---
slug: principes-itil-et-support
title: "Principes fondamentaux d'ITIL et organisation du support informatique"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 1
estimated_minutes: 45
objectives:
  - "Comprendre le rôle et la structure du référentiel ITIL (Information Technology Infrastructure Library)"
  - "Distinguer avec rigueur un Incident, une Demande de service (Service Request), un Problème et un Changement"
  - "Maîtriser les niveaux d'assistance et la matrice d'escalade hiérarchique et fonctionnelle (N1, N2, N3)"
  - "Comprendre les engagements de niveau de service (SLA, OLA, UC) et la mesure de satisfaction usager"
  - "Découvrir la gestion de la base de connaissances (KEDB - Known Error Database)"
prerequisites:
  - "reseaux-fondamentaux"
competency_refs:
  - "B1.1"
  - "B1.2"
  - "B1.5"
success_criteria:
  - "Réussir le quiz 'Principes ITIL et Support' avec au moins 80 %"
labs: []
references:
  - label: "AXELOS — ITIL 4 Foundation Overview"
    url: "https://www.axelos.com/certifications/itil-service-management"
  - label: "itSMF France — Bonnes pratiques de gestion des services IT"
    url: "https://www.itsmf.fr/"
---

# Principes Fondamentaux d'ITIL et Organisation du Support

Dans toute organisation moderne, la direction des systèmes d'information (DSI) ne se contente plus de gérer des serveurs ou des câbles réseau : elle délivre des **services numériques** à des utilisateurs métiers. Pour structurer cette relation et garantir une qualité de service mesurable, le référentiel international **ITIL** (_Information Technology Infrastructure Library_) s'est imposé comme le standard mondial.

---

## 1. La Distinction Fondamentale des Événements ITIL

L'une des compétences clés du technicien support est de qualifier immédiatement la nature d'un appel ou d'un courriel entrant :

```text
+-------------------+     +-------------------------+     +-----------------------+     +-------------------------+
|     INCIDENT      |     |   DEMANDE DE SERVICE    |     |       PROBLÈME        |     |       CHANGEMENT        |
+-------------------+     +-------------------------+     +-----------------------+     +-------------------------+
| Interruption non  |     | Demande standard d'un   |     | Cause sous-jacente ou |     | Ajout, modification ou  |
| planifiée ou      |     | utilisateur (accès,     |     | inconnue d'un ou      |     | suppression d'un composant|
| dégradation d'un  |     | matériel, conseil)      |     | plusieurs incidents   |     | d'infrastructure        |
| service en ligne  |     |                         |     | répétitifs            |     |                         |
| Ex: Imprimante HS |     | Ex: Création de compte  |     | Ex: 10 crashs hebdo   |     | Ex: Mise à niveau du    |
| Messagerie en panne|    | Nouveau PC portable     |     | du serveur SQL        |     | commutateur de cœur     |
+-------------------+     +-------------------------+     +-----------------------+     +-------------------------+
```

---

## 2. Niveaux de Support et Chaîne d'Escalade

Pour traiter efficacement les sollicitations sans saturer les ingénieurs experts, le support est traditionnellement organisé en 3 niveaux :

```text
                    [ Utilisateur Final ]
                             │
                             ▼ (Appel téléphonique / Portail web / Mail)
              +------------------------------+
              |      SUPPORT NIVEAU 1        |
              |       (Centre de Services)   |
              | - Accueil, qualification     |
              | - Résolution 1er niveau (80%)|
              | - Procédures & scripts types |
              +--------------┬---------------+
                             │ (Escalade fonctionnelle si non résolu)
                             ▼
              +------------------------------+
              |      SUPPORT NIVEAU 2        |
              |      (Techniciens Experts)   |
              | - Diagnostic approfondi      |
              | - Interventions sur site     |
              | - Administration systèmes/LAN|
              +--------------┬---------------+
                             │ (Escalade N3 si bogue éditeur ou panne majeure)
                             ▼
              +------------------------------+
              |      SUPPORT NIVEAU 3        |
              |    (Ingénieurs / Éditeurs)   |
              | - Développeurs, architectes  |
              | - Support constructeur       |
              +------------------------------+
```

### Types d'escalade :
- **Escalade fonctionnelle (Horizontale)** : Transfert du ticket vers un groupe possédant des compétences techniques plus spécialisées (ex: du N1 vers l'équipe Réseau).
- **Escalade hiérarchique (Verticale)** : Alerte adressée au responsable de service lorsque les délais contractuels (SLA) risquent d'être dépassés ou en cas de crise majeure.

---

## 3. Les Engagements Contractuels : SLA, OLA et UC

Pour évaluer la qualité du support, trois niveaux de conventions sont contractualisés :

| Sigle | Terme Complet | Définition & Parties Prenantes | Exemple Pratique |
|---|---|---|---|
| **SLA** | _Service Level Agreement_ | Contrat formel entre le **fournisseur IT et le client métier**. Définit la disponibilité et les temps cibles de résolution. | Rétablissement de la messagerie en moins de 2 heures pour la Direction. |
| **OLA** | _Operational Level Agreement_ | Accord interne entre **deux équipes internes de la DSI** pour garantir le respect du SLA global. | L'équipe Stockage s'engage à livrer un LUN à l'équipe Système en moins de 4 heures. |
| **UC** | _Underpinning Contract_ | Contrat liant la DSI à un **fournisseur / prestataire externe**. | Contrat de maintenance matérielle HP/Dell avec intervention sous 4 heures sur site (J+0). |

---

## 4. Métriques Temporelles Clés du Support

- **TTO (_Time to Own_ / Temps de prise en charge)** : Durée écoulée entre l'émission du ticket par l'utilisateur et sa prise en compte (affectation à un technicien).
- **TTR (_Time to Resolve_ / Temps de résolution)** : Durée totale écoulée entre la création du ticket et sa clôture avec solution validée.
- **FCR (_First Contact Resolution_)** : Taux de tickets résolus dès le premier contact sans transfert vers le N2.
