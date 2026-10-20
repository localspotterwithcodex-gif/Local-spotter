-- Returns (RMA), commission on sales and weekly payout runs. Additive and idempotent.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RETURN';

DO $$ BEGIN
  CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "commission_bps" INTEGER;
ALTER TABLE "business_ledger_entries" ADD COLUMN IF NOT EXISTS "rate_bps" INTEGER;

ALTER TABLE "payouts" ALTER COLUMN "requested_by_user_id" DROP NOT NULL;
ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "period_key" TEXT;
ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "iban_encrypted" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "payouts_business_id_period_key_key" ON "payouts"("business_id", "period_key");

ALTER TABLE "payout_accounts" ADD COLUMN IF NOT EXISTS "iban_encrypted" TEXT;

CREATE TABLE IF NOT EXISTS "return_requests" (
  "id" UUID NOT NULL,
  "return_number" TEXT NOT NULL,
  "order_id" UUID NOT NULL,
  "consumer_profile_id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "status" "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
  "reason" TEXT NOT NULL,
  "merchant_note" TEXT,
  "refund_amount_cents" INTEGER,
  "refund_status" TEXT,
  "restocked" BOOLEAN NOT NULL DEFAULT false,
  "decided_by_user_id" UUID,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decided_at" TIMESTAMP(3),
  "received_at" TIMESTAMP(3),
  "refunded_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "return_requests_return_number_key" ON "return_requests"("return_number");
CREATE INDEX IF NOT EXISTS "return_requests_order_id_idx" ON "return_requests"("order_id");
CREATE INDEX IF NOT EXISTS "return_requests_business_id_status_created_at_idx" ON "return_requests"("business_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "return_requests_consumer_profile_id_created_at_idx" ON "return_requests"("consumer_profile_id", "created_at");

CREATE TABLE IF NOT EXISTS "return_items" (
  "id" UUID NOT NULL,
  "return_request_id" UUID NOT NULL,
  "order_item_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  CONSTRAINT "return_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "return_items_order_item_id_idx" ON "return_items"("order_item_id");

DO $$ BEGIN
  ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_consumer_profile_id_fkey" FOREIGN KEY ("consumer_profile_id") REFERENCES "consumer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "return_items" ADD CONSTRAINT "return_items_return_request_id_fkey" FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "return_items" ADD CONSTRAINT "return_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
