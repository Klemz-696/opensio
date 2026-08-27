---
slug: gestion-tickets-et-sla
title: "Gestion des tickets d'assistance, règles de routage et engagements SLA"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 1
estimated_minutes: 50
objectives:
  - "Maîtriser le cycle de vie d'un ticket dans GLPI (Nouveau, En cours assigné/planifié, En attente, Résolu, Clos)"
  - "Comprendre la matrice d'évaluation : Urgence, Impact et Priorité calculée"
  - "Concevoir des règles métier d'affectation et de routage automatique des tickets entrants"
  - "Configurer des contrats de service SLA (TTO / TTR) avec calendriers ouvrés et notifications d'escalade"
  - "Formaliser des solutions d'assistance réutilisables et alimenter la base de connaissances"
prerequisites:
  - "principes-itil-et-support"
  - "architecture-glpi-et-deploiement"
competency_refs:
  - "B1.1"
  - "B1.2"
  - "B1.5"
success_criteria:
  - "Réussir le quiz 'Gestion des Tickets et SLA' avec au moins 80 %"
  - "Valider l'atelier 'Règles de Routage de Tickets et SLA dans GLPI'"
labs:
  - slug: regles-routage-tickets-sla
    required: true
references:
  - label: "GLPI Tickets and Helpdesk Guide"
    url: "https://glpi-user-documentation.readthedocs.io/fr/latest/modules/assistance/tickets.html"
  - label: "ITIL Service Desk & Incident Management Guidelines"
    url: "https://www.axelos.com/certifications/itil-service-management/itil-4-foundation"
---

# Gestion des Tickets d'Assistance, Règles de Routage et Engagements SLA

Le module d'assistance (_Helpdesk_) de GLPI est le cœur opérationnel du support informatique. Il permet de centraliser, prioriser, répartir et tracer l'intégralité des sollicitations formulées par les utilisateurs.

---

## 1. Cycle de Vie d'un Ticket dans GLPI

Un ticket suit un cycle d'états normalisé garantissant que chaque demande est traitée jusqu'à validation par le demandeur :

```text
               +------------------------------------+
               |           1. NOUVEAU               | (Ticket créé par utilisateur ou mailgate)
               +-----------------┬------------------+
                                 │
                                 ▼ (Prise en charge par technicien ou règle auto)
               +------------------------------------+
               |       2. EN COURS (ASSIGNÉ)        | (Technicien ou groupe affecté)
               +--------┬──────────────────┬--------+
                        │                  ▲
 (Attente retour usager)│                  │ (Reprise du travail)
                        ▼                  │
               +-----------------+         │
               | 3. EN ATTENTE   | ────────┘
               +-----------------+
                        │
                        ▼ (Solution rédigée par le technicien)
               +------------------------------------+
               |           4. RÉSOLU                | (Attente d'approbation de l'utilisateur)
               +-----------------┬------------------+
                                 │
                  ┌──────────────┴──────────────┐
                  ▼ (Refus : retour en cours)    ▼ (Approbation ou clôture auto sous 5j)
          [ EN COURS ]                 +------------------------------------+
                                       |            5. CLOS                 | (Clôture définitive avec enquête satisfaction)
                                       +------------------------------------+
```

---

## 2. Calcul de la Priorité : Matrice Urgence / Impact

Dans GLPI, la **Priorité** d'un ticket n'est pas choisie arbitrairement : elle est calculée automatiquement par croisement de l'**Urgence** (exprimée par le demandeur) et de l'**Impact** (taille du groupe d'utilisateurs affecté) :

```text
               │ Impact : Bas (1 personne) │ Impact : Moyen (1 service) │ Impact : Haut (Toute la société)
───────────────┼───────────────────────────┼────────────────────────────┼─────────────────────────────────
Urgence : Basse│           Très basse      │             Basse          │              Moyenne
Urgence : Moy. │             Basse         │            Moyenne         │               Haute
Urgence : Haute│            Moyenne        │             Haute          │            Très Haute (P1)
```

---

## 3. Moteur de Règles Métier d'Affectation Automatique

Pour éviter de trier manuellement chaque ticket arrivant par collecteur de messagerie (_Mailgate_), GLPI intègre un moteur de règles puissant :

### Structure d'une Règle Métier :
- **Critères (Conditions)** :
  - `Titre / Description` contient `[URGENT VIP]` ou `panne réseau` ou `mot de passe`.
  - `Demandeur : Groupe` est `Direction Générale`.
  - `Catégorie` est `Messagerie / Exchange`.
- **Actions (Conséquences)** :
  - Assigner au **Groupe de techniciens** : `Support Réseau & Systèmes`.
  - Définir le **Technicien responsable** : `Jean DUPONT`.
  - Appliquer le **SLA Temps de Résolution (TTR)** : `SLA Critique - 2 heures`.
  - Définir le statut : `En cours (Assigné)`.

---

## 4. Engagements de Niveau de Service : SLA et Niveaux d'Escalade

Un **SLA** (_Service Level Agreement_) associe un délai maximal et un calendrier ouvré (ex: Lundi-Vendredi 8h-18h) :

1. **SLA TTO (_Time to Own_)** : Délai maximal pour attribuer le ticket à un technicien (ex: 15 minutes).
2. **SLA TTR (_Time to Resolve_)** : Délai maximal pour proposer une solution au demandeur (ex: 4 heures).
3. **Niveaux d'Escalade automatique** :
   - *Si à 75 % du temps SLA consommé le ticket n'est toujours pas résolu* $\rightarrow$ Envoi d'un rappel automatique par e-mail au technicien.
   - *Si à 100 % du temps SLA le ticket est en retard* $\rightarrow$ Réassignation automatique au Responsable de Support (Escalade hiérarchique).
