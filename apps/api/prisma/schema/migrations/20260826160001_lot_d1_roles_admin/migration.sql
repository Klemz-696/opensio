-- Migration des données existantes : les rôles student et teacher deviennent apprenant
UPDATE "users" SET "role" = 'apprenant' WHERE "role"::text IN ('student', 'teacher');

-- AlterTable: ajout de must_change_password et changement de la valeur par défaut du rôle
ALTER TABLE "users" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'apprenant';
