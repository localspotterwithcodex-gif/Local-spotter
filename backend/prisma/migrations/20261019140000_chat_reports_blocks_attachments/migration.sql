-- Chat completion: attachments, blocking, reports, notification bookkeeping, retention index.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHAT';

DO $$ BEGIN
  CREATE TYPE "ChatReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'FRAUD', 'INAPPROPRIATE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ChatReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "conversations"
  ADD COLUMN IF NOT EXISTS "consumer_blocked_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "business_blocked_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "consumer_notified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "business_notified_at" TIMESTAMP(3);

ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "attachment_asset_id" UUID;
DO $$ BEGIN
  ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_attachment_asset_id_fkey"
    FOREIGN KEY ("attachment_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "chat_messages_created_at_idx" ON "chat_messages"("created_at");

CREATE TABLE IF NOT EXISTS "chat_reports" (
  "id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "message_id" UUID,
  "reporter_user_id" UUID NOT NULL,
  "reported_user_id" UUID,
  "reason" "ChatReportReason" NOT NULL,
  "details" TEXT,
  "message_snapshot" TEXT,
  "status" "ChatReportStatus" NOT NULL DEFAULT 'OPEN',
  "resolution_note" TEXT,
  "resolved_by_user_id" UUID,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_reports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "chat_reports_reporter_user_id_message_id_key" ON "chat_reports"("reporter_user_id", "message_id");
CREATE INDEX IF NOT EXISTS "chat_reports_status_created_at_idx" ON "chat_reports"("status", "created_at");
DO $$ BEGIN
  ALTER TABLE "chat_reports" ADD CONSTRAINT "chat_reports_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "chat_reports" ADD CONSTRAINT "chat_reports_message_id_fkey"
    FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "chat_reports" ADD CONSTRAINT "chat_reports_reporter_user_id_fkey"
    FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
