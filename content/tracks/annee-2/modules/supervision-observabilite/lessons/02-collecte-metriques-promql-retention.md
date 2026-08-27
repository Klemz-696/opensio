---
slug: collecte-metriques-promql-retention
title: "Collecte de Métriques, Séries Temporelles, PromQL Avancé et Gestion TSDB"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 3
estimated_minutes: 55
objectives:
  - "Comprendre la structure d'une série temporelle (nom, labels dimensionnels, timestamp, valeur)"
  - "Comparer les mécanismes de collecte par tirage (Pull) et par poussée (Push)"
  - "Distinguer les 4 types de métriques : Counter, Gauge, Histogram et Summary"
  - "Écrire des requêtes PromQL complexes pour calculer des taux, débits et centiles (p95/p99)"
  - "Gérer la rétention, la compaction TSDB et maîtriser les risques liés à la haute cardinalité"
prerequisites:
  - "linux-administration"
  - "concepts-supervision-alerting-sli-slo"
competency_refs:
  - "B2.1"
  - "B2.2"
success_criteria:
  - "Réussir le quiz 'Collecte de Métriques et PromQL' avec au moins 80 %"
labs:
  - slug: configuration-supervision-prometheus-grafana
    required: true
references:
  - label: "Prometheus Metric Types"
    url: "https://prometheus.io/docs/concepts/metric_types/"
  - label: "PromQL Basics & Functions"
    url: "https://prometheus.io/docs/prometheus/latest/querying/basics/"
---

# Collecte de Métriques, Séries Temporelles, PromQL Avancé et Gestion TSDB

Les **métriques** constituent la colonne vertébrale quantitative de l'observabilité. Elles permettent de quantifier l'utilisation des ressources matérielles et la santé applicative sous forme de séries chronologiques ordonnées.

---

## 1. Structure d'une Série Temporelle et les 4 Types de Métriques

Une série temporelle dans Prometheus est identifiée par un nom et un ensemble de paires **clé=valeur** appelées labels :

$$\underbrace{\text{http\_requests\_total}}_{\text{Nom de la métrique}}\{\underbrace{\text{method="POST", status="200", instance="web-01"}}_{\text{Labels dimensionnels}}\} \quad \underbrace{42589}_{\text{Valeur}} \quad \underbrace{\text{@1787851200}}_{\text{Horodatage}}$$

### Les 4 types de données fondamentaux :
1. **Counter (Compteur)** : Valeur numérique cumulative qui ne peut qu'augmenter ou être remise à zéro en cas de redémarrage (ex: nombre total de paquets reçus, requêtes HTTP traitées).
2. **Gauge (Jauge)** : Valeur numérique pouvant fluctuer librement vers le haut comme vers le bas (ex: utilisation de la mémoire RAM, espace disque libre, température CPU).
3. **Histogram (Histogramme)** : Échantillonne des observations (généralement des durées ou des tailles de réponses) et les compte dans des compartiments configurables (*buckets* `le`), permettant le calcul précis de centiles.
4. **Summary (Résumé)** : Calcule des quantiles configurables directement côté client.

---

## 2. Le Langage de Requêtes PromQL Avancé

PromQL permet d'interroger la base TSDB pour transformer des données brutes en indicateurs exploitables :

### A. Calcul de taux et de débit avec `rate()` :
La fonction `rate()` calcule le taux d'augmentation moyen par seconde sur une fenêtre temporelle glissante (toujours appliquée sur un **Counter**) :
```promql
# Débit de requêtes HTTP par seconde par code de statut
sum by (status) (rate(http_requests_total[5m]))
```

### B. Calcul de centiles de latence ($p95$ / $p99$) :
Pour connaître le temps de réponse subi par les $95\ \%$ ou $99\ \%$ des utilisateurs les plus lents :
```promql
# Latence au 95ème centile sur 5 minutes
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
```

### C. Calcul du pourcentage d'utilisation CPU :
```promql
# Utilisation CPU globale par instance Linux
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

---

## 3. Gestion du Stockage TSDB et Maîtrise de la Cardinalité

Prometheus stocke les données dans une base de données de séries temporelles (**TSDB**) optimisée :
- **Compaction** : Les échantillons en mémoire (blocs de 2 heures) sont compressés et fusionnés sur disque pour réduire l'empreinte de stockage.
- **Rétention** : Définie par le paramètre `--storage.tsdb.retention.time=30d` (ou par taille `--storage.tsdb.retention.size=50GB`).

```text
┌─────────────────────────────────────────────────────────────┐
│              ATTENTION AU PIÈGE DE LA CARDINALITÉ           │
├─────────────────────────────────────────────────────────────┤
│ Cardinalité = Nombre de séries temporelles uniques générées. │
│ ⚠️ Ne JAMAIS injecter des identifiants uniques dans les      │
│    labels (ex: user_id, email, token_jwt, ip_client).       │
│ -> 100 000 utilisateurs = 100 000 séries distinctes =       │
│    Saturation instantanée de la mémoire RAM de Prometheus.  │
└─────────────────────────────────────────────────────────────┘
```
