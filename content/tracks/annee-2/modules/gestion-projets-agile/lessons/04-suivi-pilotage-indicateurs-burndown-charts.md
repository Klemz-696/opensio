---
slug: suivi-pilotage-indicateurs-burndown-charts
title: "Suivi et Pilotage Agile : Daily Scrum, Rétrospectives, Burndown Charts et Métriques de Flux"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 45
objectives:
  - "Animer un Daily Scrum efficace de 15 minutes centré sur l'objectif de Sprint"
  - "Faciliter une rétrospective de Sprint pour améliorer la collaboration et les processus"
  - "Interpréter les courbes d'avancement d'un Sprint Burndown Chart"
  - "Mesurer et optimiser les métriques de flux : Lead Time, Cycle Time et Débit (Throughput)"
  - "Identifier les dérives de périmètre (Scope Creep) et les blocages d'équipe"
prerequisites:
  - "methodologies-agiles-scrum-kanban"
  - "planification-backlog-user-stories-estimation"
competency_refs:
  - "B1.1"
  - "B1.2"
  - "B3.4"
success_criteria:
  - "Réussir le quiz 'Suivi et Pilotage Agile' avec au moins 80 %"
labs: []
references:
  - label: "Agile Retrospectives: Making Good Teams Great (Esther Derby & Diana Larsen)"
    url: "https://pragprog.com/titles/btagrev/agile-retrospectives-second-edition/"
  - label: "Kanban Metrics: Lead Time and Cycle Time (ActionableAgile)"
    url: "https://actionableagile.com/resources/kanban-metrics/"
---

# Suivi et Pilotage Agile : Daily Scrum, Rétrospectives, Burndown Charts et Métriques de Flux

Le pilotage Agile repose sur la **transparence**, **l'inspection** et **l'adaptation** constantes pour détecter les dérives au plus tôt.

---

## 1. Rituels d'Équipe : Daily Scrum et Rétrospective

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. DAILY SCRUM (15 MIN MAX - SYNCHRONISATION)               │
│    • Qu'ai-je accompli hier pour aider l'objectif du Sprint?│
│    • Que vais-je accomplir aujourd'hui?                     │
│    • Quels obstacles m'empêchent d'avancer?                 │
├─────────────────────────────────────────────────────────────┤
│ 2. SPRINT RETROSPECTIVE (AMÉLIORATION CONTINUE)             │
│    • Qu'avons-nous bien fait ? (À conserver)                │
│    • Qu'est-ce qui a freiné l'équipe ? (Problèmes/Frustr.)  │
│    • Quelles actions concrètes appliquons-nous dès demain ? │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Le Sprint Burndown Chart

Le **Sprint Burndown Chart** visualise la quantité de travail restant dans le Sprint au fil des jours :

```text
Story Points
Restants
  25 │● (Jour 1 : Lancement du Sprint)
  20 │  ╲
  15 │    ╲───● (Plateau : Blocage technique)
  10 │        ╲
   5 │          ╲
   0 └───┬───┬───┬───┬───┬───► Jours du Sprint (1 à 10)
        J1  J3  J5  J7  J9 J10
      ── Courbe Réelle   ┄┄ Ligne Idéale Théorique
```

- **Courbe au-dessus de l'idéale** : Retard potentiel ou sous-estimation de la complexité.
- **Courbe qui remonte subitement** : Ajout imprévu de tâches en cours de Sprint (*Scope Creep*).

---

## 3. Métriques de Flux Kanban : Lead Time vs Cycle Time

```mermaid
graph LR
    IDEA["Idée / Demande Créée"] ==>|Lead Time (Délai total ressenti par l'utilisateur)| PROD["Livré en Production"]
    DEV["Début du Développement (In Progress)"] ==>|Cycle Time (Temps de traitement actif)| PROD
```

- **Lead Time** : Temps total écoulé entre l'expression du besoin par le client et sa mise à disposition réelle en production.
- **Cycle Time** : Temps pendant lequel l'équipe technique a travaillé activement sur la tâche. L'objectif d'une équipe performante est de réduire le temps d'attente passif dans les files.
