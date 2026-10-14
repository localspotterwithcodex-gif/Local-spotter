-- Forward-only, additive, idempotent. No data is dropped or rewritten.
-- Auto-translation storage ({ en: {...}, nl: {...} }) + the detected source language.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "compare_at_price" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "translations" JSONB;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "source_locale" TEXT;
ALTER TABLE "workshops" ADD COLUMN IF NOT EXISTS "translations" JSONB;
ALTER TABLE "workshops" ADD COLUMN IF NOT EXISTS "source_locale" TEXT;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "translations" JSONB;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "source_locale" TEXT;
ALTER TABLE "shop_routes" ADD COLUMN IF NOT EXISTS "translations" JSONB;
ALTER TABLE "shop_routes" ADD COLUMN IF NOT EXISTS "source_locale" TEXT;
