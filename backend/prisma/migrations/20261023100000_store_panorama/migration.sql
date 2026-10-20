-- Virtual store: one 360 (equirectangular) photo per shop (additive, idempotent).
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "panorama_asset_id" UUID;
DO $$ BEGIN
  ALTER TABLE "businesses" ADD CONSTRAINT "businesses_panorama_asset_id_fkey"
    FOREIGN KEY ("panorama_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
