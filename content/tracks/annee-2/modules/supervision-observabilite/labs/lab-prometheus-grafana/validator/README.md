# Validateur : Configuration de la Collecte Prometheus et Règles d'Alerte

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier de supervision avec Prometheus.

## Critères d'Évaluation (100 points)
1. **`prometheus_scrape_configs` (25 pts)** : Intervalles globaux, inclusion de `alerts.yml` et jobs `node-exporter` et `nginx-exporter`.
2. **`alerting_rules_structure` (25 pts)** : Définition des règles `InstanceDown` et `HighCpuUsage` avec `for:` et `severity:`.
3. **`promql_expressions_validity` (25 pts)** : Expressions PromQL (`up == 0`, calcul CPU > 85 %).
4. **`annotations_and_runbook` (25 pts)** : Présence de `summary` et `description` détaillés.

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire
```
