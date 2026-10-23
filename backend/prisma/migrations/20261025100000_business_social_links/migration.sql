-- Flexible social links per shop (additive, idempotent). Back-fills from the three single-link columns.
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "social_links" JSONB;

UPDATE "businesses" b
SET "social_links" = COALESCE((
  SELECT jsonb_agg(jsonb_build_object('platform', x.platform, 'url', x.url) ORDER BY x.ord)
  FROM (
    VALUES (1, 'instagram', b."instagram_url"), (2, 'facebook', b."facebook_url"), (3, 'tiktok', b."tiktok_url")
  ) AS x(ord, platform, url)
  WHERE x.url IS NOT NULL AND x.url <> ''
), '[]'::jsonb)
WHERE b."social_links" IS NULL;
