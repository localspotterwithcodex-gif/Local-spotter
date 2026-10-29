-- Customer-side "delete": hide a finished order / a chat from the customer's own list.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "consumer_hidden_at" TIMESTAMP(3);
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "consumer_hidden_at" TIMESTAMP(3);
