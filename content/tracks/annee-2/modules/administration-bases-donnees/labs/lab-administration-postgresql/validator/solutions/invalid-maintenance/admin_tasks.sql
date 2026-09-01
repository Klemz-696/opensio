-- =============================================================================
-- OpenSIO — Lab Solution Invalide : Maintenance et Procédures de Sauvegarde manquantes
-- =============================================================================

CREATE ROLE app_readonly WITH NOLOGIN;
CREATE ROLE app_readwrite WITH NOLOGIN;

GRANT USAGE ON SCHEMA public TO app_readonly, app_readwrite;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_readwrite;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_readwrite;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_readwrite;

CREATE USER user_reporting WITH PASSWORD 'SecurePass1!';
GRANT app_readonly TO user_reporting;

CREATE USER user_backend WITH PASSWORD 'SecurePass2!';
GRANT app_readwrite TO user_backend;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Invalide : Pas de VACUUM, pas de REINDEX, pas de pg_stat_user_tables
-- Pas de pg_stat_statements ni de commandes pg_dump -F c / pg_restore
