-- Forward-only, non-destructive catch-up for schema objects that exist in
-- schema.prisma but were never captured by a migration (the database was
-- previously synchronised with `prisma db push`). Every statement is idempotent
-- so it is safe on a database that already has these objects AND on one built
-- purely from migrations. No data is dropped or rewritten.

-- users: username login (admins), one-time-code verification
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_code" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_code_expires_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");

-- businesses: single free-text address (street/house_number kept for compatibility)
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "address" TEXT;

-- shop_registrations: leads from the public "Join as a shop" widget
CREATE TABLE IF NOT EXISTS "shop_registrations" (
    "id" UUID NOT NULL,
    "shop_name" TEXT NOT NULL,
    "contact_person_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "shop_address" TEXT NOT NULL,
    "website_instagram" TEXT,
    "shop_type" TEXT NOT NULL,
    "other_shop_type" TEXT,
    "product_count" TEXT,
    "sells_online" TEXT,
    "other_sells_online" TEXT,
    "webshop_pos" TEXT,
    "other_webshop_pos" TEXT,
    "pilot_interest" TEXT NOT NULL,
    "valuable_features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "other_feature" TEXT,
    "monthly_price" TEXT,
    "pricing_model" TEXT,
    "route_interest" TEXT,
    "route_offer" TEXT,
    "other_route_offer" TEXT,
    "biggest_challenge" TEXT,
    "source" TEXT NOT NULL DEFAULT 'website_widget',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_registrations_pkey" PRIMARY KEY ("id")
);
