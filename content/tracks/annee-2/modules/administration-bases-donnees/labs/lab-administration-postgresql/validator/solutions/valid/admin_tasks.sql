-- =============================================================================
-- OpenSIO — Lab Solution Valide : Administration, RBAC & Maintenance PostgreSQL
-- =============================================================================

-- 1. Modèle de Sécurité RBAC (Rôles & Privilèges)
CREATE ROLE app_readonly WITH NOLOGIN;
CREATE ROLE app_readwrite WITH NOLOGIN;

GRANT CONNECT ON DATABASE production_db TO app_readonly, app_readwrite;
GRANT USAGE ON SCHEMA public TO app_readonly, app_readwrite;

-- Privilèges pour le groupe de lecture seule
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_readonly;

-- Privilèges pour le groupe de lecture/écriture
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_readwrite;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_readwrite;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_readwrite;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_readwrite;

-- Création des utilisateurs applicatifs nominatifs
CREATE USER user_reporting WITH PASSWORD 'SecureReporting2026!#Pass';
GRANT app_readonly TO user_reporting;

CREATE USER user_backend WITH PASSWORD 'SecureBackendApi2026!#Db';
GRANT app_readwrite TO user_backend;


-- 2. Durcissement de Sécurité & Révocation
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE production_db FROM PUBLIC;


-- 3. Opérations de Maintenance Préventive & MVCC
VACUUM (VERBOSE, ANALYZE);
REINDEX TABLE tickets_support;

-- Requête d'audit de fragmentation et de tuples morts
SELECT 
    relname AS table_name,
    n_live_tup AS tuples_vivants,
    n_dead_tup AS tuples_morts,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;


-- 4. Métrologie des Requêtes Lentes & Procédures de Sauvegarde
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Requête du Top 5 des requêtes les plus consommatrices
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 5;

-- Commandes d'exploitation de sauvegarde et restauration :
-- Sauvegarde : pg_dump -h localhost -U postgres -F c -b -v -f /var/backups/production_db_$(date +%F).dump production_db
-- Restauration : pg_restore -h localhost -U postgres -d production_db -v --clean /var/backups/production_db_2026-08-27.dump
