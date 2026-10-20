-- Phase 7: customer order + per-store orders, fulfilment methods, hosted checkout for payments. Additive.
DO $$ BEGIN
  CREATE TYPE "FulfilmentMethod" AS ENUM ('PICKUP', 'SHIPPING', 'LOCAL_DELIVERY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "businesses"
  ADD COLUMN IF NOT EXISTS "pickup_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "shipping_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "local_delivery_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "shipping_fee" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "free_shipping_threshold" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "local_delivery_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "local_delivery_radius_km" DECIMAL(6,2);

CREATE TABLE IF NOT EXISTS "customer_orders" (
  "id" UUID NOT NULL,
  "order_number" TEXT NOT NULL,
  "consumer_profile_id" UUID NOT NULL,
  "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "total_amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "paid_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_orders_consumer_profile_id_fkey" FOREIGN KEY ("consumer_profile_id") REFERENCES "consumer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "customer_orders_order_number_key" ON "customer_orders"("order_number");
CREATE INDEX IF NOT EXISTS "customer_orders_consumer_profile_id_created_at_idx" ON "customer_orders"("consumer_profile_id", "created_at");
CREATE INDEX IF NOT EXISTS "customer_orders_payment_status_created_at_idx" ON "customer_orders"("payment_status", "created_at");

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "customer_order_id" UUID,
  ADD COLUMN IF NOT EXISTS "fulfilment_method" "FulfilmentMethod" NOT NULL DEFAULT 'SHIPPING',
  ALTER COLUMN "delivery_street" DROP NOT NULL,
  ALTER COLUMN "delivery_city" DROP NOT NULL;
DO $$ BEGIN
  ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_order_id_fkey" FOREIGN KEY ("customer_order_id") REFERENCES "customer_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "orders_customer_order_id_idx" ON "orders"("customer_order_id");
CREATE INDEX IF NOT EXISTS "orders_business_id_created_at_idx" ON "orders"("business_id", "created_at");

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "customer_order_id" UUID,
  ADD COLUMN IF NOT EXISTS "checkout_url" TEXT;
DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_order_id_fkey" FOREIGN KEY ("customer_order_id") REFERENCES "customer_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "payments_provider_transaction_id_idx" ON "payments"("provider_transaction_id");
CREATE INDEX IF NOT EXISTS "payments_customer_order_id_idx" ON "payments"("customer_order_id");
