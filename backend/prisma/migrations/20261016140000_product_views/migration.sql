-- Real product page views (previously always shown as 0). Idempotent.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "view_count" INTEGER NOT NULL DEFAULT 0;
