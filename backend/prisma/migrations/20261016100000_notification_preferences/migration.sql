-- Shop-owner notification switches. Idempotent (safe to re-run).
CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "user_id" UUID NOT NULL,
  "notify_orders" BOOLEAN NOT NULL DEFAULT true,
  "notify_reviews" BOOLEAN NOT NULL DEFAULT true,
  "notify_tips" BOOLEAN NOT NULL DEFAULT true,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id")
);

DO $$ BEGIN
  ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
