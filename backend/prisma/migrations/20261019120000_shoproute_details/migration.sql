ALTER TABLE "shop_routes"
  ADD COLUMN IF NOT EXISTS "theme" TEXT,
  ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT,
  ADD COLUMN IF NOT EXISTS "distance_km" DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS "duration_minutes" INTEGER,
  ADD COLUMN IF NOT EXISTS "stats_manual" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "shop_routes_featured_idx" ON "shop_routes"("featured");
