# Validateur : Mise en Place d'un Tableau Kanban avec Limites WIP et Simulation de Flux

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier Kanban et métriques de flux.

## Critères d'Évaluation (100 points)
1. **`kanban_board_columns_structure` (25 pts)** : Déclaration d'au moins 5 colonnes ordonnées (backlog, analysis, in_progress, review_test, done).
2. **`wip_limits_and_exit_criteria` (25 pts)** : Limites WIP explicites sur les colonnes actives et critères de sortie par colonne.
3. **`workflow_tasks_simulation` (25 pts)** : Simulation de 4 tâches avec horodatages de création, début de traitement et fin.
4. **`lead_and_cycle_time_metrics_coherence` (25 pts)** : Calculs exacts et cohérence entre Lead Time et Cycle Time.

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire
```
