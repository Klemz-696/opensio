---
slug: concepts-supervision-alerting-sli-slo
title: "Concepts de Supervision, Gestion des Alertes et Fiabilité des Services (SLI / SLO / SLA)"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 3
estimated_minutes: 50
objectives:
  - "Distinguer la supervision classique (boîte noire) de l'observabilité moderne (boîte blanche)"
  - "Maîtriser le cycle de vie complet d'une alerte, de sa détection au post-mortem sans blâme"
  - "Prévenir la fatigue des alertes (Alert Fatigue) grâce à des seuils pertinents et des runbooks"
  - "Définir des indicateurs SLI, des objectifs SLO et des engagements contractuels SLA"
  - "Piloter le compromis entre stabilité et rythme de livraison grâce au budget d'erreur"
prerequisites:
  - "linux-administration"
  - "reseaux-fondamentaux"
competency_refs:
  - "B2.1"
  - "B3.1"
success_criteria:
  - "Réussir le quiz 'Concepts de Supervision, Alerting et SLI/SLO' avec au moins 80 %"
labs: []
references:
  - label: "Google Site Reliability Engineering (SRE) Book"
    url: "https://sre.google/sre-book/table-of-contents/"
  - label: "The Art of Monitoring (James Turnbull)"
    url: "https://artofmonitoring.com/"
---

# Concepts de Supervision, Gestion des Alertes et Fiabilité des Services (SLI / SLO / SLA)

La **supervision** et l'**observabilité** constituent le système nerveux de toute infrastructure informatique d'entreprise. Elles permettent aux administrateurs de détecter immédiatement les dysfonctionnements, d'anticiper les saturations matérielles et de garantir la disponibilité des services numériques critiques.

---

## 1. De la Supervision Traditionnelle à l'Observabilité Moderne

```text
┌──────────────────────────────────────────────────────────────┐
│ 1. SUPERVISION CLASSIQUE (Boîte Noire / Black-Box)           │
│    - Vérifie l'état externe binaire : Serveur UP / DOWN ?    │
│    - Teste le ping ICMP, le port TCP 80, la réponse HTTP.    │
│    - Répond à la question : "Le service est-il en panne ?"   │
├──────────────────────────────────────────────────────────────┤
│ 2. OBSERVABILITÉ MODERNE (Boîte Blanche / White-Box)         │
│    - Analyse l'état interne : Métriques, Journaux et Traces. │
│    - Détecte les dégradations subtiles (latence, saturation).│
│    - Répond à la question : "Pourquoi le service est lent ?" │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Le Cycle de Vie d'une Alerte et la Fatigue des Alertes

Une alerte ne doit être émise que lorsqu'une **action humaine immédiate** est requise pour préserver l'activité.

```mermaid
graph TD
    A[Seuil d'anomalie dépassé pendant x minutes] --> B[Déduplication & Regroupement]
    B --> C[Routage par sévérité : Info, Warning, Critical]
    C --> D[Notification ciblée : Slack, Email, PagerDuty]
    D --> E[Prise en charge avec Runbook d'exploitation]
    E --> F[Résolution de l'incident]
    F --> G[Post-Mortem sans blâme & Ajustement des seuils]
```

### Le phénomène d'Alert Fatigue (Fatigue des alertes) :
Si des dizaines de fausses alertes ou d'alertes non urgentes (ex: disque à 82 % d'occupation) inondent les canaux de messagerie, les équipes finissent par ignorer les notifications, ce qui conduit inévitablement à manquer un incident critique majeur.

> [!TIP]
> **Règle d'or de l'alerting SRE** : Toute alerte critique qui réveille un ingénieur d'astreinte la nuit doit être associée à un **Runbook** documenté (procédure de diagnostic étape par étape) et doit impacter directement les utilisateurs finaux.

---

## 3. Cadre de Fiabilité SRE : SLI, SLO, SLA et Budget d'Erreur

Le modèle SRE (*Site Reliability Engineering*) standardise la mesure de la qualité de service :

| Concept | Définition | Exemple Concret |
|---|---|---|
| **SLI (_Service Level Indicator_)** | Métrique mesurable en temps réel évaluant la qualité du service | *Taux de requêtes HTTP réussies avec une latence < 250 ms* (actuellement : `99.93 %`) |
| **SLO (_Service Level Objective_)** | Objectif interne fixé par l'équipe technique pour piloter la qualité | *Objectif cible mensuel : `99.90 %`* |
| **SLA (_Service Level Agreement_)** | Contrat juridique engageant l'entreprise auprès de ses clients avec pénalités financières | *Engagement contractuel : `99.50 %`* |

```mermaid
graph LR
    subgraph Budget ["Budget d'Erreur (Error Budget)"]
        SLO[Objectif Interne SLO : 99.9 %]
        EB[Marge d'Indisponibilité : 0.1 %]
    end
    EB -->|Budget intact| Innov[Déploiements rapides de fonctionnalités]
    EB -->|Budget épuisé| Fix[Gel des déploiements & Priorité à la fiabilité]
```

Le **Budget d'erreur** ($100 \% - \text{SLO} = 0.1 \%$) formalise le compromis entre vitesse d'innovation et stabilité : tant que le budget n'est pas consommé, les développeurs peuvent déployer sereinement. En cas d'épuisement, tous les efforts se concentrent sur la fiabilisation de l'infrastructure.
