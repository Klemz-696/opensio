-- AlterEnum: ajouter 'apprenant' si nécessaire
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'apprenant';

-- Migration des données existantes : les rôles student et teacher deviennent apprenant
UPDATE "users" SET "role" = 'apprenant' WHERE "role"::text IN ('student', 'teacher');

-- AlterTable: ajout de must_change_password et changement de la valeur par défaut du rôle
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'apprenant'::user_role;
