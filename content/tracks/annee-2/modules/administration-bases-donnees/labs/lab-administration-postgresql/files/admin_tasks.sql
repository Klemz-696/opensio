-- =============================================================================
-- OpenSIO — Lab : Administration, RBAC & Maintenance PostgreSQL
-- Fichier à compléter : admin_tasks.sql
-- =============================================================================

-- 1. Modèle de Sécurité RBAC (Rôles & Privilèges)
-- TODO: Créer les rôles de groupe app_readonly et app_readwrite (NOLOGIN)
-- TODO: Accorder les privilèges SELECT sur public à app_readonly
-- TODO: Accorder les privilèges SELECT, INSERT, UPDATE, DELETE et SEQUENCES à app_readwrite
-- TODO: Configurer ALTER DEFAULT PRIVILEGES pour les futures tables
-- TODO: Créer les utilisateurs user_reporting et user_backend avec mots de passe et rattachements


-- 2. Durcissement de Sécurité & Révocation
-- TODO: Révoquer les droits de création sur public pour le rôle PUBLIC


-- 3. Opérations de Maintenance Préventive & MVCC
-- TODO: Exécuter VACUUM (VERBOSE, ANALYZE)
-- TODO: Lancer un REINDEX sur tickets_support (ou le schéma public)
-- TODO: Écrire la requête de consultation de pg_stat_user_tables (relname, n_live_tup, n_dead_tup)


-- 4. Métrologie des Requêtes Lentes & Procédures de Sauvegarde
-- TODO: Activer l'extension pg_stat_statements
-- TODO: Écrire la requête SQL listant le Top 5 des requêtes les plus lentes depuis pg_stat_statements
-- TODO: Documenter les commandes pg_dump -F c et pg_restore correspondantes

