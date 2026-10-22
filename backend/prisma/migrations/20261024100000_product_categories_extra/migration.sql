-- Product categories: jewelry (Sieraden), shoes (Schoenen) and home ware (Woonaccessoires), next to Kleding.
-- Idempotent: an existing category with the same slug is left untouched (the admin may have edited it).
INSERT INTO "product_categories" ("id", "name", "slug", "active", "sort_order", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'Sieraden',        'sieraden',        true, 20, NOW(), NOW()),
  (gen_random_uuid(), 'Schoenen',        'schoenen',        true, 30, NOW(), NOW()),
  (gen_random_uuid(), 'Woonaccessoires', 'woonaccessoires', true, 40, NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;
