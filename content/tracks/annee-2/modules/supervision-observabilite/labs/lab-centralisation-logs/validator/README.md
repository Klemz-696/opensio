# Validateur : Centralisation et Analyse des Journaux avec Promtail, Loki et LogQL

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier de centralisation des logs avec Loki.

## Critères d'Évaluation (100 points)
1. **`promtail_server_and_client_config` (25 pts)** : Écoute serveur, positions file et URL d'envoi vers l'API push de Loki.
2. **`promtail_scrape_and_pipeline` (25 pts)** : Scraping des logs Nginx avec labels statiques et pipeline_stages JSON.
3. **`logql_filter_query` (25 pts)** : Requête LogQL de filtrage des erreurs HTTP 5xx.
4. **`logql_metric_query` (25 pts)** : Requête LogQL métrique avec calcul de taux (rate).

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire
```
