-- Phase 3 (MASTER-PROMPT 3.2-3.7 + 8.4 columns). Additive and forward-compatible: new nullable/defaulted
-- columns, new tables and indexes only. The single dropped index is replaced by (mobile, purpose) below.

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "MediaPurpose" AS ENUM ('SHOP_ICON', 'SHOP_COVER', 'SHOP_PANORAMA', 'SHOP_VIDEO', 'PRODUCT_IMAGE', 'REVIEW_PHOTO', 'REVIEW_VIDEO', 'CHAT_ATTACHMENT');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'READY', 'REJECTED', 'DELETED');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('SIGNUP', 'LOGIN', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "SmsPurpose" AS ENUM ('OTP_SIGNUP', 'OTP_LOGIN', 'OTP_RESET', 'ORDER_READY', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'ORDER_CANCELLED');

-- CreateEnum
CREATE TYPE "SmsStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED');

-- DropIndex
DROP INDEX "phone_verifications_mobile_key";

-- AlterTable
ALTER TABLE "customer_orders" ADD COLUMN     "notify_phone_e164" TEXT;

-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN     "bucket" TEXT,
ADD COLUMN     "business_id" UUID,
ADD COLUMN     "consumer_profile_id" UUID,
ADD COLUMN     "duration_seconds" INTEGER,
ADD COLUMN     "kind" "MediaKind" NOT NULL DEFAULT 'IMAGE',
ADD COLUMN     "purpose" "MediaPurpose",
ADD COLUMN     "status" "MediaStatus" NOT NULL DEFAULT 'READY',
ADD COLUMN     "storage_path" TEXT,
ADD COLUMN     "uploaded_by_user_id" UUID;

-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN     "sms_order_updates" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "phone_verifications" ADD COLUMN     "consumed_at" TIMESTAMP(3),
ADD COLUMN     "ip_hash" TEXT,
ADD COLUMN     "purpose" "OtpPurpose" NOT NULL DEFAULT 'SIGNUP',
ADD COLUMN     "user_id" UUID;

-- AlterTable
ALTER TABLE "review_images" ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "replied_at" TIMESTAMP(3),
ADD COLUMN     "replied_by_user_id" UUID,
ADD COLUMN     "reply_text" TEXT;

-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "max_product_images" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "max_review_photos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "max_review_videos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reviews_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shop_video_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shoproutes_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_customer_photos" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "workshops_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "sms_messages" (
    "id" UUID NOT NULL,
    "purpose" "SmsPurpose" NOT NULL,
    "user_id" UUID,
    "order_id" UUID,
    "order_status_event_id" UUID,
    "idempotency_key" TEXT NOT NULL,
    "phone_last4" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "status" "SmsStatus" NOT NULL DEFAULT 'QUEUED',
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sms_messages_order_status_event_id_key" ON "sms_messages"("order_status_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "sms_messages_idempotency_key_key" ON "sms_messages"("idempotency_key");

-- CreateIndex
CREATE INDEX "sms_messages_order_id_created_at_idx" ON "sms_messages"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "sms_messages_status_created_at_idx" ON "sms_messages"("status", "created_at");

-- CreateIndex
CREATE INDEX "media_assets_business_id_purpose_idx" ON "media_assets"("business_id", "purpose");

-- CreateIndex
CREATE INDEX "media_assets_consumer_profile_id_idx" ON "media_assets"("consumer_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_bucket_storage_path_key" ON "media_assets"("bucket", "storage_path");

-- CreateIndex
CREATE INDEX "phone_verifications_mobile_purpose_created_at_idx" ON "phone_verifications"("mobile", "purpose", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "phone_verifications_mobile_purpose_key" ON "phone_verifications"("mobile", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_consumer_profile_id_order_id_product_id_key" ON "reviews"("consumer_profile_id", "order_id", "product_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_replied_by_user_id_fkey" FOREIGN KEY ("replied_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_consumer_profile_id_fkey" FOREIGN KEY ("consumer_profile_id") REFERENCES "consumer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_verifications" ADD CONSTRAINT "phone_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_order_status_event_id_fkey" FOREIGN KEY ("order_status_event_id") REFERENCES "order_status_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: existing video files are videos.
UPDATE "media_assets" SET "kind" = 'VIDEO' WHERE "mime_type" LIKE 'video/%';

-- Backfill: entitlements per plan (3.5, D3, D11). Reviews, review media and the customer photo gallery are
-- Workshop-only; reviews tied to a delivered order stay allowed on every plan (enforced in code, as today).
UPDATE "subscription_plans" SET "reviews_enabled" = false, "max_product_images" = 5,  "max_review_photos" = 0, "max_review_videos" = 0, "shop_video_enabled" = false, "show_customer_photos" = false, "workshops_enabled" = false, "shoproutes_enabled" = false WHERE "slug" = 'WEBSHOP';
UPDATE "subscription_plans" SET "reviews_enabled" = false, "max_product_images" = 8,  "max_review_photos" = 0, "max_review_videos" = 0, "shop_video_enabled" = true,  "show_customer_photos" = false, "workshops_enabled" = false, "shoproutes_enabled" = true  WHERE "slug" = 'SHOPROUTES';
UPDATE "subscription_plans" SET "reviews_enabled" = true,  "max_product_images" = 12, "max_review_photos" = 8, "max_review_videos" = 2, "shop_video_enabled" = true,  "show_customer_photos" = true,  "workshops_enabled" = true,  "shoproutes_enabled" = true  WHERE "slug" = 'WORKSHOP';
