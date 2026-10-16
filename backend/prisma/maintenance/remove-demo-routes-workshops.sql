-- Removes ONLY the two demo rows created by `ALLOW_DEMO_SEED=yes npm run seed`
-- (matched by their seed slugs). Review, then run yourself against the intended database.
-- Not a migration: it is never applied automatically. Run inside a transaction and check the counts.
BEGIN;

-- Demo shop route (stops first).
DELETE FROM route_stops
 WHERE route_id IN (SELECT id FROM shop_routes WHERE slug = 'jordaan-ambacht-design-route');
DELETE FROM shop_routes WHERE slug = 'jordaan-ambacht-design-route';

-- Demo workshop: delete only when nobody booked it; otherwise cancel it so it leaves the public list.
DELETE FROM workshops w
 WHERE w.slug = 'ambachtelijk-leerbewerken-workshop'
   AND NOT EXISTS (SELECT 1 FROM workshop_bookings b WHERE b.workshop_id = w.id);
UPDATE workshops SET status = 'CANCELLED'
 WHERE slug = 'ambachtelijk-leerbewerken-workshop';

-- Check the result, then COMMIT (or ROLLBACK).
SELECT (SELECT count(*) FROM shop_routes WHERE slug = 'jordaan-ambacht-design-route') AS demo_routes_left,
       (SELECT count(*) FROM workshops WHERE slug = 'ambachtelijk-leerbewerken-workshop' AND status <> 'CANCELLED') AS demo_workshops_left;
COMMIT;
