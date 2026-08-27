---
slug: traces-distribuees-observabilite-opentelemetry
title: "Traces Distribuées, Standard OpenTelemetry (OTel) et Corrélation de l'Observabilité"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 3
estimated_minutes: 50
objectives:
  - "Comprendre le rôle indispensable du traçage distribué dans les architectures microservices"
  - "Maîtriser les concepts de Trace, Span, Span ID et arbre d'exécution hiérarchique"
  - "Comprendre la propagation de contexte inter-services via le standard W3C Trace Context"
  - "Découvrir l'architecture du collecteur OpenTelemetry (Receivers, Processors, Exporters)"
  - "Réaliser la corrélation complète Métriques - Traces - Logs pour diagnostiquer les goulots d'étranglement"
prerequisites:
  - "concepts-supervision-alerting-sli-slo"
  - "collecte-metriques-promql-retention"
  - "gestion-centralisation-logs-loki"
competency_refs:
  - "B2.1"
  - "B2.2"
success_criteria:
  - "Réussir le quiz 'Traces Distribuées et OpenTelemetry' avec au moins 80 %"
labs: []
references:
  - label: "OpenTelemetry Official Documentation"
    url: "https://opentelemetry.io/docs/"
  - label: "W3C Trace Context Specification"
    url: "https://www.w3.org/TR/trace-context/"
---

# Traces Distribuées, Standard OpenTelemetry (OTel) et Corrélation de l'Observabilité

Dans une architecture moderne en microservices, une seule action utilisateur (ex: valider une commande) peut déclencher une chaîne complexe d'appels à travers 5 ou 10 services distincts. Les **traces distribuées** permettent de suivre et chronométrer cette requête de bout en bout.

---

## 1. Concepts Fondamentaux : Trace, Span et Arbre d'Exécution

```text
Trace ID: 4bf92f3577b34da6a3ce929d0e0e4736 (Transaction Globale : 250ms)
│
├── [Front-End Web] HTTP POST /checkout (250ms) [Span 1 - Racine]
│   │
│   ├── [Order Service] Valider panier (40ms) [Span 2]
│   │
│   ├── [Payment API] Débit bancaire externe (150ms) [Span 3] ◄── GOULOT D'ÉTRANGLEMENT
│   │
│   └── [Inventory Service] Décrémenter stock (35ms) [Span 4]
│       └── [PostgreSQL] UPDATE stock SET qte = qte - 1 (12ms) [Span 5]
```

- **Trace** : Représente le cheminement complet d'une requête à travers l'ensemble des composants d'un système distribué. Elle est identifiée par un **`Trace ID`** unique.
- **Span** : Représente une opération individuelle réalisée par un service spécifique au cours de la trace (nom d'opération, heure de début, durée, statut et attributs clé-valeur comme `http.status_code: 200` ou `db.statement`).

---

## 2. Le Standard OpenTelemetry (OTel) et la Propagation de Contexte

**OpenTelemetry** (projet majeur de la Cloud Native Computing Foundation - CNCF) standardise la collecte des métriques, logs et traces sans dépendre d'un éditeur propriétaire :

```mermaid
graph LR
    subgraph Apps ["Applications Instrumentées"]
        A1[Microservice API Node.js]
        A2[Microservice Facturation Go]
    end
    subgraph Collector ["Collecteur OpenTelemetry (OTel Collector)"]
        REC[Receivers : OTLP gRPC/HTTP]
        PROC[Processors : Batch, PII Filter]
        EXP[Exporters : OTLP, Prometheus, Tempo]
    end
    subgraph Backends ["Backends d'Observabilité"]
        P[Prometheus : Métriques]
        L[Loki : Logs]
        T[Grafana Tempo / Jaeger : Traces]
    end
    A1 -->|Protocole OTLP| REC
    A2 -->|Protocole OTLP| REC
    REC --> PROC
    PROC --> EXP
    EXP --> P
    EXP --> L
    EXP --> T
```

### La Propagation de Contexte (W3C Trace Context) :
Pour qu'un service aval sache qu'il participe à une trace initiée par un service amont, les identifiants sont transmis dans les en-têtes HTTP selon la norme W3C :
```http
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

---

## 3. La Trinité de l'Observabilité Unifiée

La puissance maximale de l'observabilité réside dans la **corrélation bidirectionnelle** :

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. DÉTECTION (Métrique Prometheus)                          │
│    -> Grafana affiche un pic de latence à 3.5s sur l'API.   │
├─────────────────────────────────────────────────────────────┤
│ 2. ISOLATION (Trace Tempo / OpenTelemetry)                  │
│    -> Un clic sur le pic ouvre la Trace exacte et révèle    │
│       que la Span "SELECT * FROM orders" a duré 3.2s.       │
├─────────────────────────────────────────────────────────────┤
│ 3. CAUSE PROFONDE (Logs Loki)                               │
│    -> La span contient le trace_id, permettant d'afficher   │
│       la ligne de log exacte : "Missing database index".    │
└─────────────────────────────────────────────────────────────┘
```
