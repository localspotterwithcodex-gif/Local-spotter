-- Session revocation and admin MFA (additive; existing sessions keep working with version 0).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "session_version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_secret" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_enabled_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_recovery_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Shared rate-limit counters.
CREATE TABLE IF NOT EXISTS "rate_limit_hits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "reset_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rate_limit_hits_pkey" PRIMARY KEY ("key")
);
CREATE INDEX IF NOT EXISTS "rate_limit_hits_reset_at_idx" ON "rate_limit_hits"("reset_at");
