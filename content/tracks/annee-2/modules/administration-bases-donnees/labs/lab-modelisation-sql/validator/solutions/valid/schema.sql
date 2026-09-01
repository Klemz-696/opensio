-- =============================================================================
-- OpenSIO — Lab Solution Valide : Conception Relationnelle & Schéma SQL
-- =============================================================================

-- 1. Table : departements
CREATE TABLE departements (
    id_departement SERIAL PRIMARY KEY,
    nom_departement VARCHAR(80) NOT NULL UNIQUE,
    code_service VARCHAR(10) NOT NULL UNIQUE,
    actif BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2. Table : utilisateurs
CREATE TABLE utilisateurs (
    id_utilisateur BIGSERIAL PRIMARY KEY,
    id_departement INT NOT NULL,
    nom VARCHAR(60) NOT NULL,
    prenom VARCHAR(60) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role_utilisateur VARCHAR(30) NOT NULL DEFAULT 'UTILISATEUR'
        CHECK (role_utilisateur IN ('UTILISATEUR', 'TECHNICIEN', 'ADMINISTRATEUR')),
    CONSTRAINT fk_utilisateur_departement
        FOREIGN KEY (id_departement)
        REFERENCES departements(id_departement)
        ON DELETE RESTRICT
);

-- 3. Table : tickets_support
CREATE TABLE tickets_support (
    id_ticket BIGSERIAL PRIMARY KEY,
    id_demandeur BIGINT NOT NULL,
    id_technicien BIGINT,
    titre VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priorite VARCHAR(20) NOT NULL
        CHECK (priorite IN ('BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE')),
    statut VARCHAR(20) NOT NULL DEFAULT 'NOUVEAU'
        CHECK (statut IN ('NOUVEAU', 'EN_COURS', 'RESOLU', 'CLOS')),
    date_creation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_cloture TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_ticket_demandeur
        FOREIGN KEY (id_demandeur)
        REFERENCES utilisateurs(id_utilisateur)
        ON DELETE CASCADE,
    CONSTRAINT fk_ticket_technicien
        FOREIGN KEY (id_technicien)
        REFERENCES utilisateurs(id_utilisateur)
        ON DELETE SET NULL
);

-- 4. Table : commentaires_ticket
CREATE TABLE commentaires_ticket (
    id_commentaire BIGSERIAL PRIMARY KEY,
    id_ticket BIGINT NOT NULL,
    id_auteur BIGINT NOT NULL,
    message TEXT NOT NULL,
    date_publication TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_commentaire_ticket
        FOREIGN KEY (id_ticket)
        REFERENCES tickets_support(id_ticket)
        ON DELETE CASCADE,
    CONSTRAINT fk_commentaire_auteur
        FOREIGN KEY (id_auteur)
        REFERENCES utilisateurs(id_utilisateur)
        ON DELETE CASCADE
);

-- 5. Index & Optimisations
CREATE INDEX idx_tickets_statut_date ON tickets_support(statut, date_creation);
CREATE INDEX idx_tickets_demandeur ON tickets_support(id_demandeur);
CREATE INDEX idx_commentaires_ticket ON commentaires_ticket(id_ticket);

-- 6. Vue de reporting : v_statistiques_departement
CREATE OR REPLACE VIEW v_statistiques_departement AS
SELECT 
    d.id_departement,
    d.nom_departement,
    COUNT(t.id_ticket) AS total_tickets,
    COUNT(CASE WHEN t.statut IN ('NOUVEAU', 'EN_COURS') THEN 1 END) AS tickets_actifs,
    COUNT(CASE WHEN t.priorite = 'CRITIQUE' THEN 1 END) AS tickets_critiques
FROM departements d
LEFT JOIN utilisateurs u ON u.id_departement = d.id_departement
LEFT JOIN tickets_support t ON t.id_demandeur = u.id_utilisateur
GROUP BY d.id_departement, d.nom_departement;
