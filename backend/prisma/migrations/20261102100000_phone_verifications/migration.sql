-- CreateTable
CREATE TABLE "phone_verifications" (
    "id" UUID NOT NULL,
    "mobile" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_sent_at" TIMESTAMP(3) NOT NULL,
    "send_count" INTEGER NOT NULL DEFAULT 1,
    "send_window_start" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),
    "token_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phone_verifications_mobile_key" ON "phone_verifications"("mobile");

