-- Phase 6: consent record, product category switch, subscription expiry reminders, store employees, chat side marker.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "consent_accepted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "consent_version" TEXT;

ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "business_subscriptions" ADD COLUMN IF NOT EXISTS "expiry_reminder_for_end" TIMESTAMP(3);

ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "from_business" BOOLEAN NOT NULL DEFAULT false;
-- Existing messages: written by the shop side when the sender is not the conversation's consumer.
UPDATE "chat_messages" m
SET "from_business" = TRUE
FROM "conversations" c
JOIN "consumer_profiles" p ON p."id" = c."consumer_profile_id"
WHERE m."conversation_id" = c."id" AND m."sender_user_id" <> p."user_id";

DO $$ BEGIN
  CREATE TYPE "EmployeeRole" AS ENUM ('MANAGER', 'STAFF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "EmployeeStatus" AS ENUM ('INVITED', 'ACTIVE', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "merchant_employees" (
  "id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "user_id" UUID,
  "email" TEXT NOT NULL,
  "role" "EmployeeRole" NOT NULL DEFAULT 'STAFF',
  "status" "EmployeeStatus" NOT NULL DEFAULT 'INVITED',
  "invite_token_hash" TEXT,
  "invite_expires_at" TIMESTAMP(3),
  "invited_by_user_id" UUID NOT NULL,
  "accepted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "merchant_employees_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "merchant_employees_invite_token_hash_key" ON "merchant_employees"("invite_token_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "merchant_employees_business_id_email_key" ON "merchant_employees"("business_id", "email");
CREATE INDEX IF NOT EXISTS "merchant_employees_user_id_status_idx" ON "merchant_employees"("user_id", "status");
DO $$ BEGIN
  ALTER TABLE "merchant_employees" ADD CONSTRAINT "merchant_employees_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "merchant_employees" ADD CONSTRAINT "merchant_employees_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
