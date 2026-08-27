# Validateur — Lab Modélisation & Schéma SQL

Ce dossier contient le script de validation autonome et les jeux d'essais pour l'atelier pratique de modélisation SQL Helpdesk.

## Critères de Validation

Le validateur vérifie l'intégrité du fichier `schema.sql` selon 4 axes (25 points chacun, total 100 points) :

1. **`tables_and_types_definition`** (25 pts) : Déclaration des 4 tables (`departements`, `utilisateurs`, `tickets_support`, `commentaires_ticket`) avec types adéquats.
2. **`integrity_constraints_and_fks`** (25 pts) : Clés primaires, clés étrangères avec `ON DELETE CASCADE` et `ON DELETE SET NULL`, contraintes `UNIQUE` et `CHECK`.
3. **`indexes_and_optimizations`** (25 pts) : Index composite sur `tickets_support(statut, date_creation)` et index sur clés étrangères.
4. **`reporting_view_and_aggregation`** (25 pts) : Vue `v_statistiques_departement` avec jointures `LEFT JOIN`, fonction `COUNT()` et clause `GROUP BY`.

## Exécution Locale

```bash
node validate.mjs ./solutions/valid
```
