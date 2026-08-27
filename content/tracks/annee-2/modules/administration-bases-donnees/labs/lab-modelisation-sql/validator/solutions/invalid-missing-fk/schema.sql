-- =============================================================================
-- OpenSIO — Lab Solution Invalide : Clés étrangères et intégrité manquantes
-- =============================================================================

CREATE TABLE departements (
    id_departement SERIAL PRIMARY KEY,
    nom_departement VARCHAR(80) NOT NULL,
    code_service VARCHAR(10) NOT NULL,
    actif BOOLEAN NOT NULL DEFAULT TRUE
);

-- Invalide : Pas de clé étrangère vers departements ni de contrainte UNIQUE
CREATE TABLE utilisateurs (
    id_utilisateur BIGSERIAL PRIMARY KEY,
    id_departement INT NOT NULL,
    nom VARCHAR(60) NOT NULL,
    prenom VARCHAR(60) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role_utilisateur VARCHAR(30) NOT NULL DEFAULT 'UTILISATEUR'
);

-- Invalide : Pas de contraintes FOREIGN KEY, CASCADE ou SET NULL
CREATE TABLE tickets_support (
    id_ticket BIGSERIAL PRIMARY KEY,
    id_demandeur BIGINT NOT NULL,
    id_technicien BIGINT,
    titre VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priorite VARCHAR(20) NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'NOUVEAU',
    date_creation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE commentaires_ticket (
    id_commentaire BIGSERIAL PRIMARY KEY,
    id_ticket BIGINT NOT NULL,
    id_auteur BIGINT NOT NULL,
    message TEXT NOT NULL,
    date_publication TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tickets_statut_date ON tickets_support(statut, date_creation);
CREATE INDEX idx_tickets_demandeur ON tickets_support(id_demandeur);
CREATE INDEX idx_commentaires_ticket ON commentaires_ticket(id_ticket);

CREATE OR REPLACE VIEW v_statistiques_departement AS
SELECT 
    d.id_departement,
    d.nom_departement,
    COUNT(t.id_ticket) AS total_tickets
FROM departements d
LEFT JOIN utilisateurs u ON u.id_departement = d.id_departement
LEFT JOIN tickets_support t ON t.id_demandeur = u.id_utilisateur
GROUP BY d.id_departement, d.nom_departement;
