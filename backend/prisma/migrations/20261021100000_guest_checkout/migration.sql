-- Guest checkout: password-less shadow accounts (additive, idempotent).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_guest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "guest_email" TEXT;
CREATE INDEX IF NOT EXISTS "users_is_guest_created_at_idx" ON "users"("is_guest", "created_at");
CREATE INDEX IF NOT EXISTS "users_guest_email_idx" ON "users"("guest_email");
