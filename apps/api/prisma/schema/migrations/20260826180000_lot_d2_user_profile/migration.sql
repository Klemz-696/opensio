-- AlterTable: ajout de avatar_url, bio et preferences sur users
ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;
ALTER TABLE "users" ADD COLUMN "bio" TEXT;
ALTER TABLE "users" ADD COLUMN "preferences" JSONB;
