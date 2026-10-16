-- Owner-requested plan prices: Webshop 12, Shoproutes 27, Workshop 57 (EUR per month).
-- Supersedes the 50/100/150 figures. Idempotent (sets absolute values by slug).
UPDATE "subscription_plans" SET "monthly_price" = 12 WHERE "slug" = 'WEBSHOP';
UPDATE "subscription_plans" SET "monthly_price" = 27 WHERE "slug" = 'SHOPROUTES';
UPDATE "subscription_plans" SET "monthly_price" = 57 WHERE "slug" = 'WORKSHOP';
