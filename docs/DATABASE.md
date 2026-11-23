# LocalSpotter — Database

PostgreSQL through Prisma (`backend/prisma/schema.prisma`, 52 models). Production and staging: one Supabase project
each (Frankfurt). Locally: any Postgres (a Docker one-liner is in `backend/.env.example`).

## Rules

- Migrations are **additive and forward-compatible**; no `DROP`/`TRUNCATE` without explicit owner approval. Apply with
  `npx prisma migrate deploy` from CI or a trusted machine — never `migrate dev`/`reset` on staging or production, never
  in the Vercel build.
- Conventions: snake_case columns (`@map`), UUID ids, `created_at` / `updated_at`.
- **Row Level Security** is enabled on every table in `public` with no policies (migration `20261120100100_enable_rls`):
  Supabase's public data API sees nothing; the API connects as the table owner. A new table must enable RLS in its own
  migration — `npx ts-node scripts/check-rls.ts` (in CI) fails otherwise.
- `schema.prisma` matches the migrations exactly: CI runs `prisma migrate diff --exit-code` after `migrate deploy`.

## Main tables

| Area | Tables |
|---|---|
| Accounts | `users` (role, `session_version`, admin MFA), `consumer_profiles`, `business_owner_profiles`, `notification_preferences` (incl. `sms_order_updates`) |
| One-time codes | `phone_verifications`: one row per (mobile, purpose) for SIGNUP / LOGIN / PASSWORD_RESET; HMAC only |
| SMS log | `sms_messages`: purpose, last 4 digits, provider, status; unique `idempotency_key` and `order_status_event_id` |
| Shops & plans | `businesses`, `subscription_plans` (entitlement columns, admin-editable), `business_subscriptions` |
| Commerce | `customer_orders` (one checkout, `notify_phone_e164`), `orders` (one per shop), `order_items`, `order_status_events` |
| Money | `payments`, `payment_webhook_events`, `business_ledger_entries` (source of the admin reports), `payouts` |
| Media | `media_assets` (bucket, storage_path, kind, purpose, status, FKs to uploader, shop and customer), `review_images` (`sort_order`) |
| Reviews | `reviews` (+ `reply_text`, `replied_at`, `replied_by_user_id`; unique consumer + order + product) |
| Security | `rate_limit_hits` (shared limiter), `audit_logs` |

## Migrations (30)

The last four: `20261101100000_security_hardening` (session revocation, admin MFA, shared rate limits),
`20261102100000_phone_verifications` (phone first at sign-up), `20261120100000_phase3_media_reviews_plans_otp_sms`
(storage metadata, review replies, plan entitlements, OTP purposes, SMS log; backfills existing rows),
`20261120100100_enable_rls`. Product images: 3 per product on every plan (D-012).

## Commands

```bash
npx prisma validate && npx prisma generate
npx prisma migrate deploy                       # with DATABASE_URL and DIRECT_URL set
npx ts-node scripts/check-rls.ts
npx ts-node scripts/seed-plans.ts --webshop=12 --shoproutes=27 --workshop=57   # idempotent, no users
ADMIN_EMAIL=you@example.nl npx ts-node scripts/create-admin.ts                 # first super admin only
ALLOW_DEMO_SEED=yes npx prisma db seed           # LOCAL ONLY: demo logins with public passwords
TEST_DATABASE_URL=... npm run test:e2e           # end-to-end tests on a separate, disposable database
```
