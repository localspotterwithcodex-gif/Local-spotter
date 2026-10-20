CREATE TABLE IF NOT EXISTS "favorites" (
  "id" UUID NOT NULL,
  "consumer_profile_id" UUID NOT NULL,
  "product_id" UUID,
  "business_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "favorites_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "favorites_one_target" CHECK (("product_id" IS NULL) <> ("business_id" IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS "favorites_consumer_profile_id_product_id_key" ON "favorites"("consumer_profile_id","product_id");
CREATE UNIQUE INDEX IF NOT EXISTS "favorites_consumer_profile_id_business_id_key" ON "favorites"("consumer_profile_id","business_id");
CREATE INDEX IF NOT EXISTS "favorites_product_id_idx" ON "favorites"("product_id");
CREATE INDEX IF NOT EXISTS "favorites_business_id_idx" ON "favorites"("business_id");
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_consumer_profile_id_fkey" FOREIGN KEY ("consumer_profile_id") REFERENCES "consumer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
