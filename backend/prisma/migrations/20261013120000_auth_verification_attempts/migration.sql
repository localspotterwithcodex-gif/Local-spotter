-- Forward-only, non-destructive: counts failed one-time-code attempts per user.
ALTER TABLE "users" ADD COLUMN "verification_attempts" INTEGER NOT NULL DEFAULT 0;
