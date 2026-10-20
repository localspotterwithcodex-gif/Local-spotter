-- Sessions per workshop, cancellation policy, minimum age, refund bookkeeping on bookings.
DO $$ BEGIN
  CREATE TYPE "SessionStatus" AS ENUM ('OPEN', 'FULL', 'CANCELLED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "workshop_sessions" (
  "id" UUID NOT NULL,
  "workshop_id" UUID NOT NULL,
  "start_time" TIMESTAMP(3) NOT NULL,
  "end_time" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER NOT NULL,
  "booked_count" INTEGER NOT NULL DEFAULT 0,
  "status" "SessionStatus" NOT NULL DEFAULT 'OPEN',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workshop_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workshop_sessions_capacity_check" CHECK ("capacity" >= 1 AND "booked_count" >= 0 AND "booked_count" <= "capacity")
);
CREATE INDEX IF NOT EXISTS "workshop_sessions_workshop_id_start_time_idx" ON "workshop_sessions"("workshop_id", "start_time");
DO $$ BEGIN
  ALTER TABLE "workshop_sessions" ADD CONSTRAINT "workshop_sessions_workshop_id_fkey"
    FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "workshops"
  ADD COLUMN IF NOT EXISTS "cancellation_deadline_hours" INTEGER NOT NULL DEFAULT 48,
  ADD COLUMN IF NOT EXISTS "refund_percentage" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "min_age" INTEGER;

ALTER TABLE "workshop_bookings"
  ADD COLUMN IF NOT EXISTS "session_id" UUID,
  ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "refund_percent" INTEGER,
  ADD COLUMN IF NOT EXISTS "refund_amount" DECIMAL(10,2);
DO $$ BEGIN
  ALTER TABLE "workshop_bookings" ADD CONSTRAINT "workshop_bookings_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "workshop_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "workshop_bookings_session_id_idx" ON "workshop_bookings"("session_id");

-- Backfill: every existing workshop becomes one session; its bookings point to it.
INSERT INTO "workshop_sessions" ("id", "workshop_id", "start_time", "end_time", "capacity", "booked_count", "status")
SELECT gen_random_uuid(), w."id", w."start_time", w."end_time", GREATEST(w."capacity", 1), LEAST(w."booked_count", GREATEST(w."capacity", 1)),
  CASE w."status"::text
    WHEN 'CANCELLED' THEN 'CANCELLED'
    WHEN 'COMPLETED' THEN 'COMPLETED'
    WHEN 'FULL' THEN 'FULL'
    ELSE 'OPEN'
  END::"SessionStatus"
FROM "workshops" w
WHERE NOT EXISTS (SELECT 1 FROM "workshop_sessions" s WHERE s."workshop_id" = w."id");

UPDATE "workshop_bookings" b
SET "session_id" = (SELECT s."id" FROM "workshop_sessions" s WHERE s."workshop_id" = b."workshop_id" ORDER BY s."start_time" LIMIT 1)
WHERE b."session_id" IS NULL;
