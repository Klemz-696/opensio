-- AlterTable
ALTER TABLE "chat_conversations" ADD COLUMN "is_custom_title" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "archived_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "chat_conversations_user_id_archived_at_idx" ON "chat_conversations"("user_id", "archived_at");
