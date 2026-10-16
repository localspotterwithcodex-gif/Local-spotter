-- Plan prices must match the requirements (EUR 50 / 100 / 150 per month).
-- Only rows still at 0 are corrected, so a price an admin set deliberately is never overwritten. Idempotent.
UPDATE "subscription_plans" SET "monthly_price" = 50  WHERE "slug" = 'WEBSHOP'    AND "monthly_price" = 0;
UPDATE "subscription_plans" SET "monthly_price" = 100 WHERE "slug" = 'SHOPROUTES' AND "monthly_price" = 0;
UPDATE "subscription_plans" SET "monthly_price" = 150 WHERE "slug" = 'WORKSHOP'   AND "monthly_price" = 0;
