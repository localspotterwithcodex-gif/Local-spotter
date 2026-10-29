-- Additive and idempotent: remember what each payment was for.
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "description" TEXT;
