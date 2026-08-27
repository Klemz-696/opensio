-- =============================================================================
-- OpenSIO — Lab Solution Invalide : Contraintes CHECK/UNIQUE et Vue manquantes
-- =============================================================================

CREATE TABLE departements (
    id_departement SERIAL PRIMARY KEY,
    nom_departement VARCHAR(80) NOT NULL,
    code_service VARCHAR(10) NOT NULL,
    actif BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE utilisateurs (
    id_utilisateur BIGSERIAL PRIMARY KEY,
    id_departement INT NOT NULL REFERENCES departements(id_departement),
    nom VARCHAR(60) NOT NULL,
    prenom VARCHAR(60) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role_utilisateur VARCHAR(30) NOT NULL DEFAULT 'UTILISATEUR'
);

CREATE TABLE tickets_support (
    id_ticket BIGSERIAL PRIMARY KEY,
    id_demandeur BIGINT NOT NULL REFERENCES utilisateurs(id_utilisateur) ON DELETE CASCADE,
    id_technicien BIGINT REFERENCES utilisateurs(id_utilisateur) ON DELETE SET NULL,
    titre VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priorite VARCHAR(20) NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'NOUVEAU',
    date_creation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE commentaires_ticket (
    id_commentaire BIGSERIAL PRIMARY KEY,
    id_ticket BIGINT NOT NULL REFERENCES tickets_support(id_ticket) ON DELETE CASCADE,
    id_auteur BIGINT NOT NULL REFERENCES utilisateurs(id_utilisateur) ON DELETE CASCADE,
    message TEXT NOT NULL,
    date_publication TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index manquants et pas de vue
