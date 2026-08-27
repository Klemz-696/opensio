-- =============================================================================
-- OpenSIO — Lab : Conception Relationnelle & Schéma SQL Helpdesk
-- Fichier à compléter : schema.sql
-- =============================================================================

-- 1. Table : departements
-- TODO: Créer la table departements avec id_departement, nom_departement, code_service, actif


-- 2. Table : utilisateurs
-- TODO: Créer la table utilisateurs avec id_utilisateur, id_departement (FK), nom, prenom, email (UNIQUE), role_utilisateur (CHECK)


-- 3. Table : tickets_support
-- TODO: Créer la table tickets_support avec id_ticket, id_demandeur (FK CASCADE), id_technicien (FK SET NULL),
-- titre, description, priorite (CHECK), statut (CHECK), date_creation, date_cloture


-- 4. Table : commentaires_ticket
-- TODO: Créer la table commentaires_ticket avec id_commentaire, id_ticket (FK CASCADE), id_auteur (FK CASCADE), message, date_publication


-- 5. Index & Optimisations
-- TODO: Créer les index idx_tickets_statut_date, idx_tickets_demandeur, idx_commentaires_ticket


-- 6. Vue de reporting : v_statistiques_departement
-- TODO: Créer la vue v_statistiques_departement avec jointures, COUNT() et GROUP BY

