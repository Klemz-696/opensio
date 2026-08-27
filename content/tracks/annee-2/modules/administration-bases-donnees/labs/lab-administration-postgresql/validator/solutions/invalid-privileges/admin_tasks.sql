-- =============================================================================
-- OpenSIO — Lab Solution Invalide : RBAC et Révocations manquantes
-- =============================================================================

-- Invalide : Création avec LOGIN direct et attribution de privilèges démesurés sans groupes
CREATE USER user_reporting WITH PASSWORD 'password123';
CREATE USER user_backend WITH PASSWORD 'password123';

-- Invalide : Pas de rôles groupes app_readonly / app_readwrite ni d'ALTER DEFAULT PRIVILEGES
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO user_backend;

-- Pas de révocation de PUBLIC

VACUUM (VERBOSE, ANALYZE);
REINDEX TABLE tickets_support;

SELECT 
    relname AS table_name,
    n_live_tup AS tuples_vivants,
    n_dead_tup AS tuples_morts
FROM pg_stat_user_tables;

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT query, total_exec_time FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 5;

-- pg_dump -U postgres -F c production_db > backup.dump
-- pg_restore -d production_db backup.dump
