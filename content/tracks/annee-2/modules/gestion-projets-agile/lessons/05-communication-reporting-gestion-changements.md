---
slug: communication-reporting-gestion-changements
title: "Gouvernance, Communication de Projet, Documentation Légère et Gestion des Changements"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 45
objectives:
  - "Distinguer le rôle et la composition d'un Comité de Pilotage (COPIL) et d'un Comité de Projet (COPROJ)"
  - "Rédiger un rapport synthétique d'avancement (Flash Report / Météo projet)"
  - "Appliquer les principes de documentation légère et vivante avec les ADR (Architecture Decision Records)"
  - "Gérer formellement les demandes d'évolution (Change Requests) et évaluer leurs impacts"
  - "Formaliser la recette fonctionnelle par un Procès-Verbal (PV de recette VABF/VSR)"
prerequisites:
  - "fondamentaux-gestion-projet-triangle-dor"
  - "methodologies-agiles-scrum-kanban"
competency_refs:
  - "B1.1"
  - "B1.2"
  - "B3.4"
success_criteria:
  - "Réussir le quiz 'Gouvernance, Communication et Gestion des Changements' avec au moins 80 %"
labs: []
references:
  - label: "Architecture Decision Records (ADR) Organization"
    url: "https://adr.github.io/"
  - label: "ISO 21502:2020 - Project, Programme and Portfolio Management"
    url: "https://www.iso.org/standard/74947.html"
---

# Gouvernance, Communication de Projet, Documentation Légère et Gestion des Changements

Même dans une organisation Agile, la gestion de projet exige une **communication structurée avec la direction**, un **suivi budgétaire rigoureux** et une **traçabilité des décisions techniques**.

---

## 1. Les Instances de Gouvernance : COPIL vs COPROJ

```mermaid
graph TD
    subgraph Strategie ["Niveau Stratégique : Comité de Pilotage (COPIL)"]
        COPIL["Composé de : Sponsors, Directeurs Métiers, DSI, Chef de Projet / PO<br>Rôle : Arbitrage budgétaire, validation des jalons majeurs et avenants"]
    end
    subgraph Operationnel ["Niveau Opérationnel : Comité de Projet (COPROJ)"]
        COPROJ["Composé de : Product Owner, Scrum Master, Lead Dev, Experts Métiers<br>Rôle : Suivi régulier des tâches, levée des risques opérationnels et planning"]
    end
    COPROJ ==>|Escalade des points bloquants & Rapports d'avancement| COPIL
    COPIL ==>|Décisions budgétaires & Arbitrages prioritaires| COPROJ
```

---

## 2. Le Flash Report et la Météo Projet

Le **Flash Report** est un document d'une seule page transmis aux décideurs pour résumer la santé globale du projet :

```text
┌─────────────────────────────────────────────────────────────┐
│                 FLASH REPORT - PROJET OPENSIO               │
├─────────────────────────────────────────────────────────────┤
│ • Météo Globale  : ☀️ VERT (Dans les clous)                 │
│ • Budget Consommé: 62 % (Prévisionnel : 65 %) - Conforme    │
│ • Jalon Suivant  : Jalon 3 "Recette VABF" prévu le 15/10    │
├─────────────────────────────────────────────────────────────┤
│ FAITS MARQUANTS DE LA PÉRIODE :                             │
│ + Livraison réussie de l'authentification MFA.              │
│ ! Risque identifié : Retard potentiel sur l'API de paiement. │
│ ? Décision requise du COPIL : Arbitrage sur l'option Cloud.  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Documentation Légère : Les ADR (Architecture Decision Records)

Plutôt que de rédiger des documents Word de 200 pages vite obsolètes, les équipes modernes utilisent des fiches **ADR** au format Markdown dans le dépôt Git :

```markdown
# ADR 04 : Choix de PostgreSQL plutôt que MongoDB pour les Utilisateurs

## Statut : Accepté (2026-08-27)
## Contexte :
Le projet nécessite des transactions financières strictes (ACID) et un modèle relationnel pour les droits d'accès.

## Décision :
Nous adoptons PostgreSQL comme base relationnelle principale.

## Conséquences :
- Positif : Intégrité référentielle garantie, support natif de JSONB.
- Négatif : Nécessite des migrations de schéma formelles.
```

---

## 4. Recette Fonctionnelle et Procès-Verbal (PV)

La fin de réalisation est sanctionnée par deux étapes formelles :
1. **VABF (_Validation d'Aptitude au Bon Fonctionnement_)** : La MOA teste le système dans un environnement de recette pour vérifier la conformité au cahier des charges.
2. **PV de Recette** : Document signé entre la MOA et la MOE actant la livraison :
   - *Sans réserve* : Acceptation totale, déclenchement du paiement final.
   - *Avec réserves* : Acceptation conditionnée à la correction sous 15 jours des anomalies mineures listées.
