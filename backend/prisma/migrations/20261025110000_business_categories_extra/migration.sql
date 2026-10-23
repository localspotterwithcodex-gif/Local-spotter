-- Shop categories (what an owner picks in Settings → Store): add Jewelry, Shoes and Home Ware.
-- Idempotent: an existing category with the same slug is left untouched (the admin may have edited it).
INSERT INTO "business_categories" ("id", "name", "slug", "active", "sort_order", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'Jewelry',   'jewelry',   true, 20, NOW(), NOW()),
  (gen_random_uuid(), 'Shoes',     'shoes',     true, 30, NOW(), NOW()),
  (gen_random_uuid(), 'Home Ware', 'home-ware', true, 40, NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;
