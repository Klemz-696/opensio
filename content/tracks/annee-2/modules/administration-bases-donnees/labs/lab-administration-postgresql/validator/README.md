# Validateur — Lab Administration & Maintenance PostgreSQL

Ce dossier contient le script de validation autonome et les jeux d'essais pour l'atelier pratique d'administration et d'exploitation PostgreSQL.

## Critères de Validation

Le validateur vérifie l'intégrité du fichier `admin_tasks.sql` selon 4 axes (25 points chacun, total 100 points) :

1. **`roles_and_privileges_rbac`** (25 pts) : Création des rôles RBAC (`app_readonly`, `app_readwrite`, `user_reporting`, `user_backend`), affectation des privilèges et `ALTER DEFAULT PRIVILEGES`.
2. **`public_schema_hardening_and_revokes`** (25 pts) : Révocation des droits de création sur le schéma `public` pour le rôle `PUBLIC`.
3. **`maintenance_vacuum_analyze_reindex`** (25 pts) : Instructions de maintenance `VACUUM ANALYZE`, `REINDEX` et requête d'audit sur `pg_stat_user_tables`.
4. **`backup_restore_and_slow_query_config`** (25 pts) : Activation de `pg_stat_statements`, requête d'extraction des 5 requêtes les plus consommatrices et commandes `pg_dump -F c` / `pg_restore`.

## Exécution Locale

```bash
node validate.mjs ./solutions/valid
```
