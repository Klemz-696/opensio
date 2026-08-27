---
slug: planification-backlog-user-stories-estimation
title: "Planification Agile : Product Backlog, User Stories, Critères d'Acceptation et Story Points"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 50
objectives:
  - "Rédiger des User Stories selon le formalisme standard et les critères de qualité INVEST"
  - "Définir des critères d'acceptation vérifiables (scénarios Given-When-Then)"
  - "Distinguer la Définition de Prêt (DoR) de la Définition de Terminé (DoD)"
  - "Pratiquer l'estimation relative collective avec le Planning Poker et la suite de Fibonacci"
  - "Calculer la Vélocité de l'équipe pour planifier les Sprints avec réalisme"
prerequisites:
  - "methodologies-agiles-scrum-kanban"
competency_refs:
  - "B1.1"
  - "B1.2"
success_criteria:
  - "Réussir le quiz 'Planification Agile et User Stories' avec au moins 80 %"
labs:
  - slug: structuration-backlog-planification-sprint
    required: true
references:
  - label: "User Stories Applied (Mike Cohn)"
    url: "https://www.mountaingoatsoftware.com/agile/user-stories"
  - label: "Agile Alliance - Story Points and Estimation Guide"
    url: "https://www.agilealliance.org/glossary/story-point/"
---

# Planification Agile : Product Backlog, User Stories, Critères d'Acceptation et Story Points

En gestion de projet Agile, la planification n'est pas un événement unique figé dans un diagramme de Gantt annuel, mais une **activité continue de raffinement et d'ajustement**.

---

## 1. Structure et Rédaction d'une User Story (US)

Une **User Story** décrit une unité de valeur métier du point de vue de l'utilisateur final :

```text
┌─────────────────────────────────────────────────────────────┐
│                    STRUCTURE D'UNE USER STORY               │
├─────────────────────────────────────────────────────────────┤
│ En tant que : [Rôle / Persona de l'utilisateur]             │
│ Je veux     : [Action / Fonctionnalité souhaitée]           │
│ Afin de     : [Bénéfice métier / Valeur apportée]           │
├─────────────────────────────────────────────────────────────┤
│ CRITÈRES D'ACCEPTATION (Conditions de succès) :             │
│ 1. Étant donné un utilisateur non connecté, lorsqu'il saisit│
│    un email valide, alors il reçoit un lien de connexion.   │
│ 2. Le mot de passe doit respecter la politique de 12 car.   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Définition de Prêt (DoR) vs Définition de Terminé (DoD)

```mermaid
graph LR
    Backlog[Product Backlog] -->|DoR : La US est claire, estimée et testable| SprintPlanning[Sprint Backlog]
    SprintPlanning -->|Développement & Tests| Dev[Incrément en cours]
    Dev -->|DoD : Tests unitaires OK, revue de code, doc| Done[Incrément Fini / Livrable]
```

- **DoR (_Definition of Ready_)** : Contrat d'entrée. La story est prête à être prise en charge par l'équipe lors du Sprint Planning.
- **DoD (_Definition of Done_)** : Contrat de sortie. Checklist stricte commune à toutes les stories garantissant la qualité sans dette technique (tests automatisés, validation sécurité, intégration continue validée).

---

## 3. Estimation Relative et Planning Poker

L'humain est médiocre pour estimer des durées absolues en heures, mais très performant pour comparer des tailles relatives (ex: *« cette tâche est 2 fois plus complexe que la tâche de référence »*).

```text
┌─────────────────────────────────────────────────────────────┐
│      SUITE DE FIBONACCI MODIFIÉE POUR STORY POINTS (SP)     │
│             1  -  2  -  3  -  5  -  8  -  13  -  20         │
└─────────────────────────────────────────────────────────────┘
```

- **Story Point (SP)** : Unité de mesure abstraite représentant l'effort global, la complexité algorithmique et l'incertitude technique.
- **Vélocité d'équipe** : Somme des Story Points des stories 100 % terminées au cours d'un Sprint. Si l'équipe a livré 22 points au Sprint 1 et 24 points au Sprint 2, sa capacité prévisionnelle pour le Sprint 3 est de $\approx 23$ points.
